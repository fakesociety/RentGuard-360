import json
import boto3
from boto3.dynamodb.conditions import Key

# וודא שזה השם המדויק של הטבלה הראשונה שיצרת
TABLE_NAME = 'RentGuard-Contracts'

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(TABLE_NAME)

def lambda_handler(event, context):
    try:
        # SECURITY FIX: Extract userId from JWT token claims (not query params!)
        # The Cognito authorizer adds claims to the request context
        claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
        user_id = claims.get('sub')  # 'sub' is the Cognito user ID
        
        # Fallback to query params ONLY for backwards compatibility during transition
        # TODO: Remove this fallback after frontend is updated
        if not user_id:
            query_params = event.get('queryStringParameters') or {}
            user_id = query_params.get('userId')
            print(f"WARNING: Using userId from query params - this is deprecated!")
        
        if not user_id:
            return {
                'statusCode': 401,
                'headers': {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Content-Type,Authorization",
                    "Access-Control-Allow-Methods": "OPTIONS,GET"
                },
                'body': json.dumps({"error": "Unauthorized - no valid user identity"})
            }

        print(f"Fetching contracts for user: {user_id}")

        # Query contracts for this user only
        response = table.query(
            KeyConditionExpression=Key('userId').eq(user_id)
        )
        
        items = response.get('Items', [])
        print(f"Found {len(items)} contracts")

        # 3. החזרת הרשימה
        return {
            'statusCode': 200,
            'headers': {
                "Access-Control-Allow-Origin": "*", # חובה ל-React
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Methods": "OPTIONS,GET"
            },
            # ensure_ascii=False מאפשר להחזיר טקסט בעברית (כמו שם קובץ) בצורה קריאה
            'body': json.dumps(items, ensure_ascii=False, default=str)
        }

    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                "Access-Control-Allow-Origin": "*",
            },
            'body': json.dumps(f"Database Error: {str(e)}")
        }