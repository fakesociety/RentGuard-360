import json
import boto3
from decimal import Decimal

# וודא שזה השם המדויק של הטבלה השנייה (של התוצאות)
TABLE_NAME = 'RentGuard-Analysis'

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(TABLE_NAME)

# פונקציית עזר לטיפול במספרים (DynamoDB מחזיר Decimal ש-JSON לא אוהב)
class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)

def lambda_handler(event, context):
    try:
        # SECURITY FIX: Extract userId from JWT token claims
        claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
        user_id = claims.get('sub')
        
        # Get contractId from query params
        query_params = event.get('queryStringParameters') or {}
        contract_id = query_params.get('contractId')
        
        if not contract_id:
            return {
                'statusCode': 400,
                'headers': {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Content-Type,Authorization",
                    "Access-Control-Allow-Methods": "OPTIONS,GET"
                },
                'body': json.dumps({"error": "Missing contractId parameter"})
            }

        print(f"Fetching analysis for: {contract_id}, user: {user_id}")

        # Fetch the analysis item
        response = table.get_item(
            Key={'contractId': contract_id}
        )
        
        item = response.get('Item')

        if not item:
            return {
                'statusCode': 404,
                'headers': {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Content-Type,Authorization",
                    "Access-Control-Allow-Methods": "OPTIONS,GET"
                },
                'body': json.dumps({"message": "Analysis not found or still processing"})
            }
        
        # SECURITY: Verify ownership - check that contract belongs to this user
        # The userId is stored in the item from save-results.py
        stored_user_id = item.get('userId')
        if user_id and stored_user_id and user_id != stored_user_id:
            print(f"Security violation: User {user_id} trying to access contract owned by {stored_user_id}")
            return {
                'statusCode': 403,
                'headers': {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "Content-Type,Authorization",
                    "Access-Control-Allow-Methods": "OPTIONS,GET"
                },
                'body': json.dumps({"error": "Access denied - contract belongs to another user"})
            }

        return {
            'statusCode': 200,
            'headers': {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type,Authorization",
                "Access-Control-Allow-Methods": "OPTIONS,GET"
            },
            'body': json.dumps(item, ensure_ascii=False, cls=DecimalEncoder)
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