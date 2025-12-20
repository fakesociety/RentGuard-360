import json
import boto3
import uuid
from urllib.parse import quote
from datetime import datetime

s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')

# S3 bucket for contract storage
BUCKET_NAME = 'rentguard-contracts-moty-101225'
# DynamoDB tables
contracts_table = dynamodb.Table('RentGuard-Contracts')
consent_table = dynamodb.Table('RentGuard-UserConsent')

def lambda_handler(event, context):
    try:
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
        try:
            claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
            user_id = claims.get('sub') or claims.get('cognito:username') or claims.get('email', 'anonymous')
            print(f"Extracted userId: {user_id}")
        except Exception as e:
            print(f"Warning: Could not extract userId from claims: {e}")
        
        # 3. Create unique contract ID and file key
        contract_id = str(uuid.uuid4())
        file_key = f"uploads/{user_id}/contract-{contract_id}.pdf"

        # 4. Build S3 params with metadata (URL-encode non-ASCII characters)
        # S3 metadata only allows ASCII, so we URL-encode Hebrew/Unicode values
        s3_params = {
            'Bucket': BUCKET_NAME,
            'Key': file_key,
            'ContentType': 'application/pdf',
            'Metadata': {
                'original-filename': quote(original_file_name[:255], safe=''),
                'property-address': quote(property_address[:255], safe='') if property_address else '',
                'landlord-name': quote(landlord_name[:255], safe='') if landlord_name else '',
                'user-id': user_id[:255]
            }
        }

        # 5. Generate presigned URL (expires in 5 minutes)
        presigned_url = s3.generate_presigned_url(
            'put_object',
            Params=s3_params,
            ExpiresIn=300
        )

        # 6. Record user consent in DynamoDB
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
                print(f"Warning: Could not record consent: {e}")
                # Continue anyway - consent recording failure shouldn't block upload

        # 7. Create initial contract record with status='uploaded' for auto-polling
        try:
            contract_item = {
                'userId': user_id,
                'contractId': contract_id,
                'fileName': original_file_name,
                'uploadDate': datetime.utcnow().isoformat(),
                'status': 'uploaded',  # Will be updated to 'analyzed' after analysis completes
                's3Key': file_key,
                'termsAccepted': terms_accepted,
                'termsAcceptedAt': datetime.utcnow().isoformat() if terms_accepted else None
            }
            
            # Add optional metadata if available
            if property_address:
                contract_item['propertyAddress'] = property_address
            if landlord_name:
                contract_item['landlordName'] = landlord_name
            
            print(f"Creating initial contract record: {contract_id}")
            contracts_table.put_item(Item=contract_item)
            print("Initial contract record created successfully")
        except Exception as e:
            print(f"Warning: Could not create initial contract record: {e}")
            # Continue anyway - save-results.py will create the record after analysis

        # 7. Return response to frontend
        return {
            'statusCode': 200,
            'headers': {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type,Authorization",
                "Access-Control-Allow-Methods": "OPTIONS,GET,PUT"
            },
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
            'headers': {
                "Access-Control-Allow-Origin": "*",
            },
            'body': json.dumps(f"Server Error: {str(e)}")
        }