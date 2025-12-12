import json
import boto3
import uuid

s3 = boto3.client('s3')

# S3 bucket for contract storage
BUCKET_NAME = 'rentguard-contracts-moty-101225'

def lambda_handler(event, context):
    try:
        # 1. Get filename from query parameters
        query_params = event.get('queryStringParameters') or {}
        original_name = query_params.get('fileName', 'unknown.pdf')
        
        # 2. Extract userId from Cognito authorizer claims
        # API Gateway with Cognito authorizer passes user info in requestContext
        user_id = 'anonymous'
        try:
            claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
            # Try to get user identifier (prefer 'sub' which is the unique Cognito user ID)
            user_id = claims.get('sub') or claims.get('cognito:username') or claims.get('email', 'anonymous')
            print(f"Extracted userId: {user_id}")
        except Exception as e:
            print(f"Warning: Could not extract userId from claims: {e}")
        
        # 3. Create unique file key with userId in path
        # Format: uploads/{userId}/contract-{uuid}.pdf
        unique_id = str(uuid.uuid4())
        file_key = f"uploads/{user_id}/contract-{unique_id}.pdf"

        # 4. Generate presigned URL for direct S3 upload (expires in 5 minutes)
        presigned_url = s3.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': BUCKET_NAME,
                'Key': file_key,
                'ContentType': 'application/pdf'
            },
            ExpiresIn=300
        )

        # 5. Return response to frontend
        return {
            'statusCode': 200,
            'headers': {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type,Authorization",
                "Access-Control-Allow-Methods": "OPTIONS,GET"
            },
            'body': json.dumps({
                'uploadUrl': presigned_url,
                'key': file_key,
                'fileName': original_name,
                'userId': user_id  # Return userId so frontend knows it's captured
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