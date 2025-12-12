import json
import boto3
from datetime import datetime
from decimal import Decimal

# DynamoDB connection
dynamodb = boto3.resource('dynamodb')
analysis_table = dynamodb.Table('RentGuard-Analysis')
contracts_table = dynamodb.Table('RentGuard-Contracts')

# Helper function to convert floats to Decimals (required for DynamoDB)
def convert_floats_to_decimals(obj):
    if isinstance(obj, float):
        return Decimal(str(obj))
    elif isinstance(obj, dict):
        return {k: convert_floats_to_decimals(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_floats_to_decimals(i) for i in obj]
    return obj

def extract_user_id_from_key(s3_key):
    """
    Extract userId from S3 key path.
    Expected format: uploads/{userId}/contract-{uuid}.pdf
    """
    try:
        parts = s3_key.split('/')
        if len(parts) >= 3 and parts[0] == 'uploads':
            return parts[1]  # userId is the second part
    except Exception as e:
        print(f"Warning: Could not extract userId from key: {e}")
    return None

def lambda_handler(event, context):
    try:
        print("Received event:", json.dumps(event))
        
        # 1. Extract data from previous step
        contract_id = event.get('contractId')
        analysis_result = event.get('analysis_result')
        s3_key = event.get('key')
        
        # Fallback for contract_id
        if not contract_id:
            contract_id = event.get('contract_id') or s3_key
        
        if not contract_id:
            raise ValueError("CRITICAL ERROR: Missing contractId in input event")
        
        # 2. Extract userId from S3 key path
        user_id = extract_user_id_from_key(s3_key or contract_id)
        print(f"Extracted userId: {user_id}")
        
        if not analysis_result:
            print(f"Warning: No analysis result found for {contract_id}")
            analysis_result = {"error": "No analysis data found", "is_contract": False}

        # 3. Convert floats to Decimal for DynamoDB
        clean_analysis = convert_floats_to_decimals(analysis_result)

        # Extract risk score if available
        risk_score = 0
        if isinstance(clean_analysis, dict):
            risk_score = clean_analysis.get('overall_risk_score', 0)

        # 4. Save to RentGuard-Analysis table
        analysis_item = {
            'contractId': contract_id,
            'timestamp': datetime.utcnow().isoformat(),
            'analysis_result': clean_analysis,
            'risk_score': risk_score,
            'status': 'COMPLETED'
        }
        
        # Add userId if extracted
        if user_id:
            analysis_item['userId'] = user_id
        
        print(f"Saving to Analysis table: {json.dumps(analysis_item, default=str)}")
        analysis_table.put_item(Item=analysis_item)
        print("Analysis saved successfully")

        # 5. Also save/update entry in RentGuard-Contracts table for user's contract list
        if user_id:
            try:
                contract_item = {
                    'userId': user_id,
                    'contractId': contract_id,
                    'fileName': s3_key.split('/')[-1] if s3_key else 'unknown.pdf',
                    'uploadDate': datetime.utcnow().isoformat(),
                    'status': 'analyzed',
                    'riskScore': risk_score
                }
                print(f"Saving to Contracts table: {json.dumps(contract_item, default=str)}")
                contracts_table.put_item(Item=contract_item)
                print("Contract record saved successfully")
            except Exception as e:
                print(f"Warning: Could not save to Contracts table: {e}")

        # 6. Return clean response for notification step
        return {
            'contractId': contract_id,
            'userId': user_id,
            'status': 'success',
            'risk_score': risk_score
        }

    except Exception as e:
        print(f"Error saving to DB: {str(e)}")
        raise e