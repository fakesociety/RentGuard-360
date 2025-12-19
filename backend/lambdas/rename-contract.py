"""
RentGuard-360: Update Contract Lambda
Updates contract metadata (fileName, propertyAddress, landlordName) in DynamoDB.
"""

import json
import boto3
from decimal import Decimal

# Initialize DynamoDB
dynamodb = boto3.resource('dynamodb')
contracts_table = dynamodb.Table('RentGuard-Contracts')
analysis_table = dynamodb.Table('RentGuard-Analysis')

def lambda_handler(event, context):
    """
    Update a contract's metadata in DynamoDB.
    
    Expected body:
    {
        "contractId": "uuid",
        "userId": "user-id", 
        "fileName": "New Contract Name.pdf",  // optional
        "propertyAddress": "123 Main St",     // optional
        "landlordName": "John Doe"            // optional
    }
    """
    
    # CORS headers for all responses
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
    }
    
    try:
        # Handle OPTIONS preflight
        if event.get('httpMethod') == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': headers,
                'body': json.dumps({'message': 'CORS preflight OK'})
            }
        
        # Parse request body
        body = event.get('body', '{}')
        if isinstance(body, str):
            body = json.loads(body)
        
        contract_id = body.get('contractId')
        user_id = body.get('userId')
        new_file_name = body.get('fileName', '').strip() if body.get('fileName') else None
        property_address = body.get('propertyAddress', '').strip() if body.get('propertyAddress') else None
        landlord_name = body.get('landlordName', '').strip() if body.get('landlordName') else None
        
        # Validate required fields
        if not contract_id:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'contractId is required'})
            }
        
        if not user_id:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'userId is required'})
            }
        
        # Build update expression dynamically
        update_parts = []
        expression_values = {}
        
        if new_file_name:
            # Ensure filename ends with .pdf
            if not new_file_name.lower().endswith('.pdf'):
                new_file_name = f"{new_file_name}.pdf"
            update_parts.append('fileName = :fn')
            expression_values[':fn'] = new_file_name
        
        if property_address is not None:
            update_parts.append('propertyAddress = :pa')
            expression_values[':pa'] = property_address
        
        if landlord_name is not None:
            update_parts.append('landlordName = :ln')
            expression_values[':ln'] = landlord_name
        
        if not update_parts:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({'error': 'At least one field (fileName, propertyAddress, landlordName) is required'})
            }
        
        update_expression = 'SET ' + ', '.join(update_parts)
        
        # Update the contracts table
        contracts_table.update_item(
            Key={
                'userId': user_id,
                'contractId': contract_id
            },
            UpdateExpression=update_expression,
            ExpressionAttributeValues=expression_values
        )
        
        print(f"Updated contract {contract_id} for user {user_id}: {update_parts}")
        
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'success': True,
                'contractId': contract_id,
                'updated': {
                    'fileName': new_file_name,
                    'propertyAddress': property_address,
                    'landlordName': landlord_name
                }
            })
        }
        
    except Exception as e:
        print(f"Error renaming contract: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({'error': str(e)})
        }
