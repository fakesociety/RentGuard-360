import json
import boto3
from datetime import datetime
from decimal import Decimal

s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')

# Configuration
BUCKET_NAME = 'rentguard-contracts'  # Same bucket as uploads
TABLE_NAME = 'RentGuardContracts'    # Same table as contracts

def lambda_handler(event, context):
    """
    Save edited contract to S3 and update DynamoDB with edit history
    
    Expected body:
    {
        "contractId": "original contract ID",
        "userId": "user ID",
        "editedClauses": { "clause-0": { "text": "...", "action": "accepted" }, ... },
        "fullEditedText": "full contract text with edits applied"
    }
    """
    # CORS headers
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
    }
    
    # Handle preflight
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': headers, 'body': ''}
    
    try:
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        
        # SECURITY FIX: Extract userId from JWT token claims (not body!)
        claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
        user_id = claims.get('sub')  # 'sub' is the Cognito user ID
        
        # Fallback for transition period (TODO: remove after full deployment)
        if not user_id:
            user_id = body.get('userId', '').strip()
            print(f"WARNING: Using userId from body - this is deprecated!")
        
        contract_id = body.get('contractId', '').strip()
        edited_clauses = body.get('editedClauses', {})
        full_edited_text = body.get('fullEditedText', '')
        
        # Validate required fields
        if not contract_id:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({
                    'success': False,
                    'error': 'contractId is required'
                })
            }
        
        if not user_id:
            return {
                'statusCode': 401,
                'headers': headers,
                'body': json.dumps({
                    'success': False,
                    'error': 'Unauthorized - no valid user identity'
                })
            }
        
        if not edited_clauses:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({
                    'success': False,
                    'error': 'No edits to save'
                })
            }
        
        timestamp = datetime.utcnow().isoformat()
        
        # 1. Save edited contract text to S3
        # OPTIMIZATION: Use a fixed key for the edited version to avoid spamming S3 with multiple versions
        # This will overwrite the previous edited version
        edited_key = contract_id.replace('.pdf', '') + '_edited.txt'
        
        s3.put_object(
            Bucket=BUCKET_NAME,
            Key=edited_key,
            Body=full_edited_text.encode('utf-8'),
            ContentType='text/plain; charset=utf-8',
            Metadata={
                'original_contract_id': contract_id,
                'user_id': user_id,
                'edit_timestamp': timestamp,
                'edits_count': str(len(edited_clauses))
            }
        )
        
        # 2. Update DynamoDB
        table = dynamodb.Table(TABLE_NAME)
        
        # Update the contract record with the latest edit info
        # We perform an UPSERT on the specific edit fields rather than appending to a history list
        table.update_item(
            Key={'contractId': contract_id},
            UpdateExpression='SET lastEditedAt = :timestamp, editedVersion = :version, editsCount = :count',
            ExpressionAttributeValues={
                ':timestamp': timestamp,
                ':version': edited_key,
                ':count': len(edited_clauses)
            }
        )
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'success': True,
                'message': 'Contract edits saved successfully!',
                'editedKey': edited_key,
                'timestamp': timestamp,
                'editsCount': len(edited_clauses)
            })
        }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'success': False,
                'error': 'Failed to save contract edits. Please try again later.'
            })
        }
