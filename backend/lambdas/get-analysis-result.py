"""
=============================================================================
LAMBDA: get-analysis-result
Retrieves contract analysis results for a specific contract
=============================================================================

Trigger: API Gateway (GET /analysis)
Input: Query parameter 'contractId'
Output: Full analysis result with issues, scores, and contract text

DynamoDB Tables:
  - RentGuard-Analysis: Read analysis results by contractId

Security:
  - Extracts userId from JWT claims (Cognito authorizer)
  - Verifies contract ownership before returning data
  - Returns 403 if user tries to access another user's contract

=============================================================================
"""

# =============================================================================
# IMPORTS
# =============================================================================

import json
import os
import boto3
from decimal import Decimal
import traceback
import hashlib
import time
from boto3.dynamodb.conditions import Key

# =============================================================================
# CONFIGURATION
# =============================================================================

TABLE_NAME = os.environ.get('ANALYSIS_TABLE', 'RentGuard-Analysis')
CONTRACTS_TABLE_NAME = os.environ.get('CONTRACTS_TABLE', 'RentGuard-Contracts')
CONTRACTS_BUCKET = os.environ.get('CONTRACTS_BUCKET')

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(TABLE_NAME)
contracts_table = dynamodb.Table(CONTRACTS_TABLE_NAME)
s3 = boto3.client('s3')

# Standard CORS headers for API Gateway responses
CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "OPTIONS,GET"
}


def _response_headers():
    headers = dict(CORS_HEADERS)
    headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    headers['Pragma'] = 'no-cache'
    return headers

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

class DecimalEncoder(json.JSONEncoder):
    """
    Custom JSON encoder for DynamoDB Decimal types.
    DynamoDB returns numbers as Decimal, which json.dumps() cannot serialize.
    """
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)


def _is_shared_request(event):
    """Detect whether request came through the public /shared-analysis route."""
    resource_path = (event.get('resource') or '').strip()
    request_path = (event.get('path') or '').strip()
    return resource_path == '/shared-analysis' or request_path.endswith('/shared-analysis')


def _hash_share_token(share_token):
    return hashlib.sha256(share_token.encode('utf-8')).hexdigest()


def _resolve_contract_id_from_share_token(share_token):
    if not share_token:
        return None, None, 'Missing share token'

    token_hash = _hash_share_token(share_token)
    response = contracts_table.query(
        IndexName='shareTokenHash-index',
        KeyConditionExpression=Key('shareTokenHash').eq(token_hash),
        Limit=1
    )
    items = response.get('Items') or []
    if not items:
        return None, None, 'Invalid or revoked share link'

    match = items[0]
    if not match.get('shareEnabled', False):
        return None, None, 'Share link is disabled'

    expires_at = int(match.get('shareTokenExpiresAt') or 0)
    if expires_at <= int(time.time()):
        return None, None, 'Share link has expired'

    return match.get('contractId'), match.get('userId'), None


def _split_edited_text_to_clauses(full_text):
    if not full_text:
        return []
    return [p.strip() for p in full_text.split('\n\n') if p and p.strip()]


def _build_edited_clauses_map(original_clauses, current_clauses):
    if not isinstance(original_clauses, list) or not isinstance(current_clauses, list):
        return {}

    delta = {}
    max_len = max(len(original_clauses), len(current_clauses))
    for idx in range(max_len):
        original_text = str(original_clauses[idx] if idx < len(original_clauses) else '').strip()
        current_text = str(current_clauses[idx] if idx < len(current_clauses) else '').strip()
        if current_text and original_text != current_text:
            delta[f'clause-{idx}'] = {
                'text': current_text,
                'action': 'shared-diff'
            }

    return delta


def _hydrate_edited_contract(item, contract_id, owner_user_id=None):
    """
    Attach latest edited contract text (if exists) so shared view can show final edited version.
    """
    user_id = owner_user_id or item.get('userId')
    if not user_id or not CONTRACTS_BUCKET:
        return item

    try:
        contract_record_resp = contracts_table.get_item(
            Key={'userId': user_id, 'contractId': contract_id},
            ConsistentRead=True
        )
        contract_record = contract_record_resp.get('Item') or {}
        edited_key = contract_record.get('editedVersion')
        edited_clauses = contract_record.get('editedClauses') or {}

        if not edited_key:
            return item

        edited_obj = s3.get_object(Bucket=CONTRACTS_BUCKET, Key=edited_key)
        edited_text = edited_obj['Body'].read().decode('utf-8')
        edited_clauses_list = _split_edited_text_to_clauses(edited_text)

        merged = dict(item)
        original_snapshot = item.get('original_clauses_list') if isinstance(item.get('original_clauses_list'), list) else item.get('clauses_list')
        if isinstance(original_snapshot, list):
            merged['originalClausesList'] = original_snapshot

        if isinstance(edited_clauses, dict) and edited_clauses:
            merged['editedClauses'] = edited_clauses
        elif isinstance(original_snapshot, list):
            merged['editedClauses'] = _build_edited_clauses_map(original_snapshot, edited_clauses_list)

        merged['fullEditedText'] = edited_text
        merged['clauses_list'] = edited_clauses_list
        merged['sharedContentSource'] = 'editedVersion'
        return merged
    except Exception as exc:
        # Non-fatal: return original analysis payload if hydration fails.
        print(f"Edited version hydration skipped: {str(exc)}")
        traceback.print_exc()
        merged = dict(item)
        merged['sharedContentSource'] = 'analysisFallback'
        merged['sharedHydrationError'] = str(exc)
        return merged

# =============================================================================
# MAIN HANDLER
# =============================================================================

def lambda_handler(event, context):
    """
    Main Lambda entry point - fetches analysis results for a contract.
    
    Args:
        event: API Gateway event with queryStringParameters and requestContext
        context: AWS Lambda context object
    
    Returns:
        dict: API Gateway response with statusCode, headers, and body
    """
    try:
        is_shared = _is_shared_request(event)

        # 1. Extract userId from JWT token claims (security)
        claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
        user_id = claims.get('sub')
        
        # 2. Resolve contractId from query params (or share token on public route)
        query_params = event.get('queryStringParameters') or {}
        contract_id = query_params.get('contractId')
        shared_owner_user_id = None

        if is_shared:
            share_token = query_params.get('shareToken')
            contract_id, shared_owner_user_id, token_error = _resolve_contract_id_from_share_token(share_token)
            if token_error:
                return {
                    'statusCode': 403,
                    'headers': _response_headers(),
                    'body': json.dumps({'error': token_error})
                }
        
        if not contract_id:
            return {
                'statusCode': 400,
                'headers': _response_headers(),
                'body': json.dumps({"error": "Missing contractId parameter"})
            }

        print(f"Fetching analysis for: {contract_id}, user: {user_id}, sharedRoute={is_shared}")

        # 3. Fetch the analysis item from DynamoDB
        response = table.get_item(Key={'contractId': contract_id})
        item = response.get('Item')

        if not item:
            return {
                'statusCode': 404,
                'headers': _response_headers(),
                'body': json.dumps({"message": "Analysis not found or still processing"})
            }
        
        # 4. Security check - verify contract ownership on authenticated route only
        stored_user_id = item.get('userId')
        if not is_shared and user_id and stored_user_id and user_id != stored_user_id:
            print(f"Security violation: User {user_id} trying to access contract owned by {stored_user_id}")
            return {
                'statusCode': 403,
                'headers': _response_headers(),
                'body': json.dumps({"error": "Access denied - contract belongs to another user"})
            }

        # 5. Shared route only: hydrate the latest edited version.
        if is_shared:
            item = _hydrate_edited_contract(item, contract_id, owner_user_id=shared_owner_user_id)

        # 6. Public shared response should not leak owner metadata.
        response_item = dict(item)
        if is_shared:
            response_item.pop('userId', None)
        else:
            # Keep the authenticated/original page in editable "pre-apply" mode.
            # If an original snapshot exists, return it for the app UI.
            original_snapshot = response_item.get('original_clauses_list')
            if isinstance(original_snapshot, list) and original_snapshot:
                response_item['clauses_list'] = original_snapshot
                response_item['full_text'] = '\n\n'.join(original_snapshot)
                response_item.pop('fullEditedText', None)

        # 7. Return the analysis result
        return {
            'statusCode': 200,
            'headers': _response_headers(),
            'body': json.dumps(response_item, ensure_ascii=False, cls=DecimalEncoder)
        }

    except Exception as e:
        print(f"Error: {str(e)}")
        traceback.print_exc()
        return {
            'statusCode': 500,
            'headers': _response_headers(),
            'body': json.dumps(f"Database Error: {str(e)}")
        }