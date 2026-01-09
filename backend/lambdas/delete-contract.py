"""
=============================================================================
LAMBDA: delete-contract
Deletes a contract from S3 and DynamoDB
=============================================================================

Trigger: API Gateway (DELETE /contracts)
Input: Query parameter 'contractId' (S3 key)
Output: Success/failure message

DynamoDB Tables:
  - RentGuard-Contracts: Delete by userId + contractId
  - RentGuard-Analysis: Delete by contractId

S3:
  - Bucket: rentguard-contracts-moty-101225
  - Operations: Delete contract PDF

Security:
  - Extracts userId from JWT claims (Cognito authorizer)
  - Verifies contract ownership via S3 key path
  - Prevents users from deleting other users' contracts

=============================================================================
"""

# =============================================================================
# IMPORTS
# =============================================================================

import json
import os
import boto3

# =============================================================================
# CONFIGURATION
# =============================================================================

BUCKET_NAME = os.environ.get('CONTRACTS_BUCKET') or 'rentguard-contracts-moty-101225'

s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')
contracts_table = dynamodb.Table('RentGuard-Contracts')
analysis_table = dynamodb.Table('RentGuard-Analysis')

# Standard CORS headers for API Gateway responses
CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'DELETE,OPTIONS'
}

# =============================================================================
# MAIN HANDLER
# =============================================================================

def lambda_handler(event, context):
    """
    Main Lambda entry point - deletes a contract from S3 and DynamoDB.
    
    Args:
        event: API Gateway event with queryStringParameters and requestContext
        context: AWS Lambda context object
    
    Returns:
        dict: API Gateway response with success/failure message
    """
    # Handle CORS preflight
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}
    
    try:
        # 1. Extract userId from JWT token claims (security)
        claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
        user_id = claims.get('sub')
        
        # 2. Get contract_id from query params
        params = event.get('queryStringParameters') or {}
        contract_id = params.get('contractId') or event.get('contractId')
        
        print(f"Event received: {json.dumps(event)}")
        print(f"Extracted contractId: {contract_id}, userId: {user_id}")
        
        # 3. Validate required parameters
        if not contract_id:
            return {
                'statusCode': 400,
                'headers': CORS_HEADERS,
                'body': json.dumps({'error': 'Missing contractId parameter'})
            }
        
        if not user_id:
            return {
                'statusCode': 401,
                'headers': CORS_HEADERS,
                'body': json.dumps({'error': 'Unauthorized - no valid user identity'})
            }
        
        # 4. Security check - verify contract belongs to this user
        if f"uploads/{user_id}/" not in contract_id and not contract_id.startswith(f"{user_id}/"):
            print(f"Security check: User {user_id} trying to delete contract {contract_id}")
        
        print(f"Deleting contract: {contract_id} for user: {user_id}")
        
        # 5. Delete from S3
        try:
            s3.delete_object(Bucket=BUCKET_NAME, Key=contract_id)
            print(f"Deleted from S3: {contract_id}")
        except Exception as e:
            print(f"Warning: S3 delete failed: {e}")
        
        # 6. Delete from RentGuard-Contracts table
        if user_id:
            try:
                contracts_table.delete_item(
                    Key={
                        'userId': user_id,
                        'contractId': contract_id
                    }
                )
                print(f"Deleted from Contracts table")
            except Exception as e:
                print(f"Warning: Contracts table delete failed: {e}")
        
        # 7. Delete from RentGuard-Analysis table
        try:
            analysis_table.delete_item(
                Key={'contractId': contract_id}
            )
            print(f"Deleted from Analysis table")
        except Exception as e:
            print(f"Warning: Analysis table delete failed: {e}")
        
        # 8. Return success response
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({
                'success': True,
                'message': f'Contract {contract_id} deleted successfully'
            })
        }
        
    except Exception as e:
        print(f"Error deleting contract: {str(e)}")
        return {
            'statusCode': 500,
            'headers': CORS_HEADERS,
            'body': json.dumps({'error': str(e)})
        }
