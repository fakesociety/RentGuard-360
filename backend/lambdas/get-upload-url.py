"""
=============================================================================
LAMBDA: get-upload-url
Generates a presigned S3 URL for contract upload
=============================================================================

Trigger: API Gateway (GET /upload-url)
Input: Query parameters - fileName, originalFileName, propertyAddress, 
       landlordName, termsAccepted
Output: Presigned S3 PUT URL and contract metadata

DynamoDB Tables:
  - RentGuard-Contracts: Creates initial record with status='uploaded'
  - RentGuard-UserConsent: Records user consent for contract upload

S3:
    - Bucket: (from CONTRACTS_BUCKET environment variable)
  - Operations: Generate presigned PUT URL

Security:
  - Extracts userId from JWT claims (Cognito authorizer)
  - S3 key includes userId for data isolation

=============================================================================
"""

# =============================================================================
# IMPORTS
# =============================================================================

import json
import os
import boto3
import uuid
from datetime import datetime
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

from botocore.config import Config

# =============================================================================
# CONFIGURATION
# =============================================================================

# NOTE: Must be provided by CloudFormation.
BUCKET_NAME = os.environ.get('CONTRACTS_BUCKET')
STRIPE_API_URL = (os.environ.get('STRIPE_API_URL') or '').rstrip('/')
PAYMENT_INTERNAL_API_KEY = os.environ.get('PAYMENT_INTERNAL_API_KEY', '')
PRESIGNED_URL_EXPIRY = 300  # 5 minutes

# Force SigV4 for browser-compatible presigned URLs.
s3 = boto3.client('s3', config=Config(signature_version='s3v4'))
dynamodb = boto3.resource('dynamodb')
contracts_table = dynamodb.Table(os.environ.get('CONTRACTS_TABLE', 'RentGuard-Contracts'))
consent_table = dynamodb.Table(os.environ.get('USER_CONSENT_TABLE', 'RentGuard-UserConsent'))

# Standard CORS headers for API Gateway responses
CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "OPTIONS,GET,PUT"
}


def user_in_admin_group(raw_groups):
    """Safely check whether Cognito groups include exactly 'Admins'."""
    if isinstance(raw_groups, list):
        return any(str(g).strip() == 'Admins' for g in raw_groups)

    groups_text = str(raw_groups or '').strip()
    if not groups_text:
        return False

    try:
        parsed = json.loads(groups_text)
        if isinstance(parsed, list):
            return any(str(g).strip() == 'Admins' for g in parsed)
    except Exception:
        pass

    normalized = groups_text.replace('[', '').replace(']', '').replace('"', '')
    parts = [p.strip() for p in normalized.split(',') if p.strip()]
    return 'Admins' in parts


def deduct_scan_for_user(user_id):
    """
    Ask payment API to atomically deduct one scan credit.

    Returns:
        tuple[bool, str]: (allowed, reason)

    Raises:
        RuntimeError: when payment API is not configured.
        Exception: for network/API failures.
    """
    if not STRIPE_API_URL:
        raise RuntimeError('STRIPE_API_URL environment variable is not set')

    endpoint = f"{STRIPE_API_URL}/api/payments/deduct-internal"
    payload = json.dumps({'userId': user_id}).encode('utf-8')
    request_headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
    }
    if PAYMENT_INTERNAL_API_KEY:
        request_headers['X-Internal-Api-Key'] = PAYMENT_INTERNAL_API_KEY

    request = Request(
        endpoint,
        data=payload,
        method='POST',
        headers=request_headers
    )

    try:
        with urlopen(request, timeout=3) as response:
            body = response.read().decode('utf-8')
            data = json.loads(body) if body else {}
            if isinstance(data, dict):
                return True, data.get('message', 'OK')
            return True, 'OK'
    except HTTPError as e:
        error_body = e.read().decode('utf-8', errors='replace')
        if e.code in (400, 404):
            reason = 'No active plan or no scans remaining'
            try:
                parsed = json.loads(error_body)
                if isinstance(parsed, dict):
                    reason = parsed.get('error') or parsed.get('message') or reason
            except Exception:
                pass
            return False, reason
        raise Exception(f'Payment API HTTP {e.code}: {error_body[:300]}')
    except URLError as e:
        raise Exception(f'Payment API unreachable: {e.reason}')

# =============================================================================
# MAIN HANDLER
# =============================================================================

def lambda_handler(event, context):
    """
    Main Lambda entry point - generates presigned URL for contract upload.
    
    Args:
        event: API Gateway event with query parameters
        context: AWS Lambda context object
    
    Returns:
        dict: API Gateway response with presigned URL and contract metadata
    """
    try:
        if not BUCKET_NAME:
            return {
                'statusCode': 500,
                'headers': CORS_HEADERS,
                'body': json.dumps({'error': 'CONTRACTS_BUCKET environment variable is not set'})
            }
        # 1. Get parameters from query string
        query_params = event.get('queryStringParameters') or {}
        original_name = query_params.get('fileName', 'unknown.pdf')
        original_file_name = query_params.get('originalFileName', original_name)
        property_address = query_params.get('propertyAddress', '')
        landlord_name = query_params.get('landlordName', '')
        terms_accepted = query_params.get('termsAccepted', 'false') == 'true'
        
        print(f"Received: fileName={original_name}, address={property_address}, landlord={landlord_name}, terms={terms_accepted}")
        
        # 2. Extract userId from Cognito authorizer claims
        user_id = 'anonymous'
        groups_value = ''
        try:
            claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
            user_id = claims.get('sub') or claims.get('cognito:username') or claims.get('email', 'anonymous')
            groups_value = str(claims.get('cognito:groups', ''))
            print(f"Extracted userId: {user_id}")
        except Exception as e:
            print(f"Warning: Could not extract userId from claims: {e}")

        # 3. Enforce eligibility on server side by atomically deducting one scan.
        if not user_id or user_id == 'anonymous':
            return {
                'statusCode': 401,
                'headers': CORS_HEADERS,
                'body': json.dumps({'error': 'Authentication required'})
            }

        is_admin = user_in_admin_group(groups_value)
        if not is_admin:
            if STRIPE_API_URL and not PAYMENT_INTERNAL_API_KEY:
                print('Configuration error: PAYMENT_INTERNAL_API_KEY is missing while STRIPE_API_URL is configured')
                return {
                    'statusCode': 500,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({'error': 'Subscription service internal key is not configured'})
                }

            try:
                allowed, reason = deduct_scan_for_user(user_id)
                if not allowed:
                    return {
                        'statusCode': 403,
                        'headers': CORS_HEADERS,
                        'body': json.dumps({
                            'error': reason,
                            'code': 'NO_ACTIVE_PLAN_OR_SCANS'
                        })
                    }
            except RuntimeError as e:
                print(f"Configuration error: {e}")
                return {
                    'statusCode': 500,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({'error': 'Subscription service is not configured'})
                }
            except Exception as e:
                print(f"Failed to deduct scan for user {user_id}: {e}")
                return {
                    'statusCode': 503,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({'error': 'Could not validate subscription status. Please try again.'})
                }
        else:
            print(f"Admin user {user_id} detected - skipping scan deduction")
        
        # 4. Create unique contract ID and file key
        contract_id = str(uuid.uuid4())
        file_key = f"uploads/{user_id}/contract-{contract_id}.pdf"

        # 5. Build S3 params for presigned URL
        # IMPORTANT: Do NOT include Metadata in the presigned params.
        # The browser upload does not reliably send x-amz-meta-* headers,
        # and if we sign them the PUT will fail with 403 (signature mismatch).
        s3_params = {
            'Bucket': BUCKET_NAME,
            'Key': file_key,
            'ContentType': 'application/pdf',
        }

        # 6. Generate presigned URL
        presigned_url = s3.generate_presigned_url(
            'put_object',
            Params=s3_params,
            ExpiresIn=PRESIGNED_URL_EXPIRY
        )

        # 7. Record user consent in DynamoDB
        if terms_accepted:
            try:
                consent_item = {
                    'userId': user_id,
                    'timestamp': datetime.utcnow().isoformat(),
                    'action': 'contract_upload',
                    'termsVersion': 'v1.0',
                    'contractId': contract_id,
                    'ipAddress': event.get('requestContext', {}).get('identity', {}).get('sourceIp', 'unknown'),
                    'userAgent': event.get('headers', {}).get('User-Agent', 'unknown')[:500]
                }
                consent_table.put_item(Item=consent_item)
                print(f"Consent recorded for user {user_id}")
            except Exception as e:
                # Continue anyway - consent recording failure shouldn't block upload
                print(f"Warning: Could not record consent: {e}")

        # 8. Create initial contract record for auto-polling.
        # IMPORTANT: This record is created BEFORE the actual S3 PUT happens.
        # The frontend will delete it if the browser upload fails.
        try:
            contract_item = {
                'userId': user_id,
                'contractId': contract_id,
                'fileName': original_file_name,
                'uploadDate': datetime.utcnow().isoformat(),
                'status': 'uploading',
                's3Key': file_key,
                'termsAccepted': terms_accepted,
                'termsAcceptedAt': datetime.utcnow().isoformat() if terms_accepted else None
            }
            
            if property_address:
                contract_item['propertyAddress'] = property_address
            if landlord_name:
                contract_item['landlordName'] = landlord_name
            
            print(f"Creating initial contract record: {contract_id}")
            contracts_table.put_item(Item=contract_item)
            print("Initial contract record created successfully")
        except Exception as e:
            # Continue anyway - save-results.py will create the record after analysis
            print(f"Warning: Could not create initial contract record: {e}")

        # 9. Return response to frontend
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({
                'uploadUrl': presigned_url,
                'key': file_key,
                'contractId': contract_id,
                'fileName': original_name,
                'userId': user_id,
                'metadata': {
                    'originalFileName': original_file_name,
                    'propertyAddress': property_address,
                    'landlordName': landlord_name
                }
            })
        }

    except Exception as e:
        print(f"Error generating URL: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {"Access-Control-Allow-Origin": "*"},
            'body': json.dumps(f"Server Error: {str(e)}")
        }