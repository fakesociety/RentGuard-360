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
        
        contract_id = body.get('contractId', '').strip()
        user_id = body.get('userId', '').strip()
        edited_clauses = body.get('editedClauses', {})
        full_edited_text = body.get('fullEditedText', '')
        
        # Validate required fields
        if not all([contract_id, user_id]):
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({
                    'success': False,
                    'error': 'contractId and userId are required'
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
        # Create a new key for the edited version
        edited_key = contract_id.replace('.pdf', '') + f'_edited_{timestamp.replace(":", "-")}.txt'
        
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
        
        # 2. Update DynamoDB with edit history
        table = dynamodb.Table(TABLE_NAME)
        
        # Get current item to find existing edits
        try:
            response = table.get_item(Key={'contractId': contract_id})
            existing_item = response.get('Item', {})
            edit_history = existing_item.get('editHistory', [])
        except Exception:
            edit_history = []
        
        # Add new edit entry
        new_edit = {
            'timestamp': timestamp,
            'editedKey': edited_key,
            'clausesEdited': len(edited_clauses),
            'actions': {k: v.get('action', 'unknown') for k, v in edited_clauses.items()}
        }
        edit_history.append(new_edit)
        
        # Update the contract record
        table.update_item(
            Key={'contractId': contract_id},
            UpdateExpression='SET editHistory = :history, lastEditedAt = :timestamp, editedVersion = :version',
            ExpressionAttributeValues={
                ':history': edit_history,
                ':timestamp': timestamp,
                ':version': edited_key
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
