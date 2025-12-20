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

def extract_contract_id_from_key(s3_key):
    """Extract contractId (UUID) from S3 key path: uploads/{userId}/contract-{uuid}.pdf"""
    try:
        # Get the filename part: contract-{uuid}.pdf
        parts = s3_key.split('/')
        if len(parts) >= 3:
            filename = parts[-1]  # contract-{uuid}.pdf
            # Remove 'contract-' prefix and '.pdf' suffix
            if filename.startswith('contract-') and filename.endswith('.pdf'):
                return filename[9:-4]  # Extract UUID
    except Exception as e:
        print(f"Warning: Could not extract contractId from key: {e}")
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
        passed_contract_id = event.get('contractId') or event.get('contract_id')
        analysis_result = event.get('analysis_result')
        s3_key = event.get('key')
        s3_bucket = event.get('bucket', BUCKET_NAME)
        
        # Moty's additions: clauses and sanitized text
        clauses_list = event.get('clauses', [])
        full_text = event.get('sanitizedText', '')
        
        # CRITICAL: Always extract contractId from s3_key (which contains the UUID from get-upload-url)
        # The passed contractId from Step Functions may be wrong/different from the one in DynamoDB
        contract_id = None
        if s3_key:
            # Extract UUID from path: uploads/{userId}/contract-{uuid}.pdf
            contract_id = extract_contract_id_from_key(s3_key)
            if contract_id:
                print(f"Using contractId from s3_key: {contract_id}")
                if passed_contract_id and passed_contract_id != contract_id:
                    print(f"WARNING: Passed contractId '{passed_contract_id}' differs from s3_key UUID '{contract_id}'. Using s3_key UUID.")
        
        # Fallback to passed contractId if s3_key extraction failed
        if not contract_id:
            contract_id = passed_contract_id
            print(f"Fallback: Using passed contractId: {contract_id}")
        
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

        # 6. UPDATE existing contract record in RentGuard-Contracts (created by get-upload-url)
        if user_id:
            try:
                # Update the existing record with analysis results
                update_expression = "SET #status = :status, analyzedDate = :analyzedDate, riskScore = :riskScore"
                expression_values = {
                    ':status': 'analyzed',
                    ':analyzedDate': datetime.utcnow().isoformat(),
                    ':riskScore': risk_score
                }
                expression_names = {
                    '#status': 'status'  # 'status' is a reserved word in DynamoDB
                }
                
                print(f"Updating contract {contract_id} to status='analyzed'")
                contracts_table.update_item(
                    Key={
                        'userId': user_id,
                        'contractId': contract_id
                    },
                    UpdateExpression=update_expression,
                    ExpressionAttributeValues=expression_values,
                    ExpressionAttributeNames=expression_names
                )
                print("Contract record updated successfully")
            except Exception as e:
                print(f"Warning: Could not update Contracts table: {e}")

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