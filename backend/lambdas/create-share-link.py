"""
=============================================================================
LAMBDA: create-share-link
Creates a secure expiring share token for a contract
=============================================================================

Trigger: API Gateway (POST /contracts/share-link)
Input: JSON body with contractId and optional expiresInDays
Output: Share path containing opaque token

DynamoDB Tables:
  - RentGuard-Contracts: Update share token hash + expiration for user's contract

Security:
  - Requires Cognito authentication
  - User can create link only for their own contract

=============================================================================
"""

import json
import os
import boto3
import hashlib
import secrets
import time
from datetime import datetime

CONTRACTS_TABLE_NAME = os.environ.get('CONTRACTS_TABLE', 'RentGuard-Contracts')
dynamodb = boto3.resource('dynamodb')
contracts_table = dynamodb.Table(CONTRACTS_TABLE_NAME)

CORS_HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'POST,OPTIONS'
}


def _clamp_days(days_value):
    try:
        days = int(days_value)
    except Exception:
        days = 7
    return max(1, min(30, days))


def _token_hash(token):
    return hashlib.sha256(token.encode('utf-8')).hexdigest()


def lambda_handler(event, context):
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': ''
        }

    try:
        claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
        user_id = claims.get('sub')
        if not user_id:
            return {
                'statusCode': 401,
                'headers': CORS_HEADERS,
                'body': json.dumps({'error': 'Unauthorized'})
            }

        body = event.get('body') or '{}'
        if isinstance(body, str):
            body = json.loads(body)

        contract_id = (body.get('contractId') or '').strip()
        expires_in_days = _clamp_days(body.get('expiresInDays', 7))

        if not contract_id:
            return {
                'statusCode': 400,
                'headers': CORS_HEADERS,
                'body': json.dumps({'error': 'contractId is required'})
            }

        # Verify ownership before issuing share token.
        current_item = contracts_table.get_item(Key={'userId': user_id, 'contractId': contract_id}).get('Item')
        if not current_item:
            return {
                'statusCode': 404,
                'headers': CORS_HEADERS,
                'body': json.dumps({'error': 'Contract not found'})
            }

        token = secrets.token_urlsafe(32)
        token_hash = _token_hash(token)
        now_epoch = int(time.time())
        expires_epoch = now_epoch + (expires_in_days * 24 * 60 * 60)
        updated_at = datetime.utcnow().isoformat()

        contracts_table.update_item(
            Key={'userId': user_id, 'contractId': contract_id},
            UpdateExpression='SET shareEnabled = :enabled, shareTokenHash = :hash, shareTokenExpiresAt = :exp, shareUpdatedAt = :ts',
            ExpressionAttributeValues={
                ':enabled': True,
                ':hash': token_hash,
                ':exp': expires_epoch,
                ':ts': updated_at
            }
        )

        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({
                'success': True,
                'contractId': contract_id,
                'shareToken': token,
                'expiresAt': expires_epoch,
                'expiresInDays': expires_in_days
            })
        }

    except Exception as exc:
        print(f'Error creating share link: {str(exc)}')
        return {
            'statusCode': 500,
            'headers': CORS_HEADERS,
            'body': json.dumps({'error': str(exc)})
        }
