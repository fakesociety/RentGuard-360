import json
import boto3
from datetime import datetime
from decimal import Decimal
from urllib.parse import unquote

# Clients
dynamodb = boto3.resource('dynamodb')
s3 = boto3.client('s3')
analysis_table = dynamodb.Table('RentGuard-Analysis')
contracts_table = dynamodb.Table('RentGuard-Contracts')

BUCKET_NAME = 'rentguard-contracts-moty-101225'

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
    """Extract userId from S3 key path: uploads/{userId}/contract-{uuid}.pdf"""
    try:
        parts = s3_key.split('/')
        if len(parts) >= 3 and parts[0] == 'uploads':
            return parts[1]
    except Exception as e:
        print(f"Warning: Could not extract userId from key: {e}")
    return None

def get_s3_metadata(bucket, key):
    """Fetch S3 object metadata (original filename, address, landlord)"""
    try:
        response = s3.head_object(Bucket=bucket, Key=key)
        metadata = response.get('Metadata', {})
        # URL-decode the values (they were encoded to support Hebrew/Unicode)
        return {
            'originalFileName': unquote(metadata.get('original-filename', '')),
            'propertyAddress': unquote(metadata.get('property-address', '')),
            'landlordName': unquote(metadata.get('landlord-name', ''))
        }
    except Exception as e:
        print(f"Warning: Could not get S3 metadata: {e}")
        return {}

def lambda_handler(event, context):
    try:
        print("Received event:", json.dumps(event))
        
        # 1. Extract data from previous step
        contract_id = event.get('contractId')
        analysis_result = event.get('analysis_result')
        s3_key = event.get('key')
        s3_bucket = event.get('bucket', BUCKET_NAME)
        
        # Moty's additions: clauses and sanitized text
        clauses_list = event.get('clauses', [])
        full_text = event.get('sanitizedText', '')
        
        if not contract_id:
            contract_id = event.get('contract_id') or s3_key
        
        if not contract_id:
            raise ValueError("CRITICAL ERROR: Missing contractId in input event")
        
        # 2. Extract userId from S3 key path
        user_id = extract_user_id_from_key(s3_key or contract_id)
        print(f"Extracted userId: {user_id}")
        
        # 3. Fetch S3 metadata (original filename, address, landlord)
        s3_metadata = {}
        if s3_key:
            s3_metadata = get_s3_metadata(s3_bucket, s3_key)
            print(f"S3 Metadata: {s3_metadata}")
        
        if not analysis_result:
            print(f"Warning: No analysis result found for {contract_id}")
            analysis_result = {"error": "No analysis data found", "is_contract": False}

        # 4. Convert floats to Decimal for DynamoDB
        clean_analysis = convert_floats_to_decimals(analysis_result)

        # Extract risk score if available
        risk_score = 0
        if isinstance(clean_analysis, dict):
            risk_score = clean_analysis.get('overall_risk_score', 0)

        # 5. Save to RentGuard-Analysis table
        analysis_item = {
            'contractId': contract_id,
            'timestamp': datetime.utcnow().isoformat(),
            'analysis_result': clean_analysis,
            'risk_score': risk_score,
            'status': 'COMPLETED',
            # Moty's additions
            'clauses_list': clauses_list,
            'full_text': full_text
        }
        
        if user_id:
            analysis_item['userId'] = user_id
        
        print(f"Saving to Analysis table: {json.dumps(analysis_item, default=str)}")
        analysis_table.put_item(Item=analysis_item)
        print("Analysis saved successfully")

        # 6. Save to RentGuard-Contracts table with original filename and metadata
        if user_id:
            try:
                # Use original filename from S3 metadata, fallback to key-based name
                original_filename = s3_metadata.get('originalFileName', '')
                if not original_filename:
                    original_filename = s3_key.split('/')[-1] if s3_key else 'unknown.pdf'
                
                contract_item = {
                    'userId': user_id,
                    'contractId': contract_id,
                    'fileName': original_filename,
                    'uploadDate': datetime.utcnow().isoformat(),
                    'status': 'analyzed',
                    'riskScore': risk_score
                }
                
                # Add optional metadata if available
                if s3_metadata.get('propertyAddress'):
                    contract_item['propertyAddress'] = s3_metadata['propertyAddress']
                if s3_metadata.get('landlordName'):
                    contract_item['landlordName'] = s3_metadata['landlordName']
                
                print(f"Saving to Contracts table: {json.dumps(contract_item, default=str)}")
                contracts_table.put_item(Item=contract_item)
                print("Contract record saved successfully")
            except Exception as e:
                print(f"Warning: Could not save to Contracts table: {e}")

        # 7. Return clean response for notification step
        return {
            'contractId': contract_id,
            'userId': user_id,
            'status': 'success',
            'risk_score': risk_score
        }

    except Exception as e:
        print(f"Error saving to DB: {str(e)}")
        raise e