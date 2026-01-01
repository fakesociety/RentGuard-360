import json
import boto3
import os

cognito = boto3.client('cognito-idp')

USER_POOL_ID = os.environ.get('USER_POOL_ID', 'us-east-1_rwsncOnh1')

def lambda_handler(event, context):
    """
    Delete a user from Cognito (admin only).
    This action is PERMANENT and cannot be undone.
    """
    # SECURITY: Verify Admin Group
    claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
    groups = claims.get('cognito:groups', '')
    
    if 'Admins' not in str(groups):
        return {
            'statusCode': 403,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            'body': json.dumps({'error': 'Admin access required'})
        }
    
    # DEBUG: Log the entire incoming event
    print("=" * 50)
    print("DELETE USER LAMBDA INVOKED")
    print("=" * 50)
    print(f"Full event: {json.dumps(event, default=str)}")
    print(f"HTTP Method: {event.get('httpMethod', 'UNKNOWN')}")
    print(f"Path: {event.get('path', 'UNKNOWN')}")
    print(f"Query params: {event.get('queryStringParameters')}")
    print(f"Body: {event.get('body')}")
    print("=" * 50)
    
    try:
        # Get username from query parameters first (for DELETE requests)
        query_params = event.get('queryStringParameters') or {}
        print(f"Parsed query_params: {query_params}")
        username = query_params.get('username')
        print(f"Username from query params: {username}")
        
        # Fall back to body if not in query params
        if not username:
            print("Username not in query params, checking body...")
            raw_body = event.get('body', '{}') or '{}'
            print(f"Raw body: {raw_body}")
            body = json.loads(raw_body)
            print(f"Parsed body: {body}")
            username = body.get('username')
            print(f"Username from body: {username}")
        
        if not username:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                },
                'body': json.dumps({'error': 'Username is required'})
            }
        
        # Delete user from Cognito
        print(f"Attempting to delete user: {username}")
        print(f"Using USER_POOL_ID: {USER_POOL_ID}")
        
        cognito.admin_delete_user(
            UserPoolId=USER_POOL_ID,
            Username=username
        )
        
        print(f"SUCCESS: User {username} deleted successfully")
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            },
            'body': json.dumps({
                'message': f'User {username} deleted successfully',
                'username': username
            })
        }
        
    except cognito.exceptions.UserNotFoundException:
        print(f"ERROR: User {username} not found in Cognito")
        return {
            'statusCode': 404,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            },
            'body': json.dumps({'error': 'User not found'})
        }
    except Exception as e:
        import traceback
        print(f"ERROR deleting user: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            },
            'body': json.dumps({'error': str(e)})
        }
