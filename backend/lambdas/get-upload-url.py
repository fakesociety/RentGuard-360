import json
import boto3
import uuid
from urllib.parse import quote

s3 = boto3.client('s3')

# S3 bucket for contract storage
BUCKET_NAME = 'rentguard-contracts-moty-101225'

def lambda_handler(event, context):
    try:
        # 1. Get parameters from query string
        query_params = event.get('queryStringParameters') or {}
        original_name = query_params.get('fileName', 'unknown.pdf')
        original_file_name = query_params.get('originalFileName', original_name)
        property_address = query_params.get('propertyAddress', '')
        landlord_name = query_params.get('landlordName', '')
        
        print(f"Received: fileName={original_name}, address={property_address}, landlord={landlord_name}")
        
        # 2. Extract userId from Cognito authorizer claims
        user_id = 'anonymous'
        try:
            claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
            user_id = claims.get('sub') or claims.get('cognito:username') or claims.get('email', 'anonymous')
            print(f"Extracted userId: {user_id}")
        except Exception as e:
            print(f"Warning: Could not extract userId from claims: {e}")
        
        # 3. Create unique file key with userId in path
        unique_id = str(uuid.uuid4())
        file_key = f"uploads/{user_id}/contract-{unique_id}.pdf"

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

        # 6. Return response to frontend
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