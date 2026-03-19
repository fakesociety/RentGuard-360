"""
=============================================================================
LAMBDA: delete-user
Permanently deletes a user from Cognito User Pool (admin only)
=============================================================================

Trigger: API Gateway (DELETE /admin/users)
Input: Query parameter 'username' or JSON body with username
Output: Success/failure message

External Services:
  - Cognito: Delete user

Security:
  - Requires 'Admins' group membership in Cognito
  - Returns 403 if user is not an admin

WARNING: This action is PERMANENT and cannot be undone!

Environment Variables:
    - USER_POOL_ID: Cognito User Pool ID (required)

=============================================================================
"""

# =============================================================================
# IMPORTS
# =============================================================================

import json
import boto3
import os
import traceback
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
from urllib.parse import quote

# =============================================================================
# CONFIGURATION
# =============================================================================
cognito = boto3.client('cognito-idp')
STRIPE_API_URL = (os.environ.get('STRIPE_API_URL') or '').rstrip('/')
PAYMENT_INTERNAL_API_KEY = os.environ.get('PAYMENT_INTERNAL_API_KEY', '')

# Standard CORS headers for API Gateway responses
CORS_HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'DELETE,OPTIONS',
}

# =============================================================================
# MAIN HANDLER
# =============================================================================


def user_in_admin_group(raw_groups):
    if isinstance(raw_groups, list):
        return any(str(g).strip() == 'Admins' for g in raw_groups)

    groups_text = str(raw_groups or '').strip()
    if not groups_text:
        return False

    try:
        parsed = json.loads(groups_text)
        if isinstance(parsed, list):
            return any(str(g).strip() == 'Admins' for g in parsed)
    except Exception:
        pass

    normalized = groups_text.replace('[', '').replace(']', '').replace('"', '')
    parts = [p.strip() for p in normalized.split(',') if p.strip()]
    return 'Admins' in parts

def get_attribute(user_attributes, attr_name):
    for attr in user_attributes or []:
        if attr.get('Name') == attr_name:
            return attr.get('Value')
    return None


def delete_sql_subscription(user_id):
    if not user_id or not STRIPE_API_URL:
        return {'attempted': False, 'deleted': False, 'reason': 'Missing userId or STRIPE_API_URL'}

    if not PAYMENT_INTERNAL_API_KEY:
        return {
            'attempted': False,
            'deleted': False,
            'reason': 'PAYMENT_INTERNAL_API_KEY is not configured'
        }

    endpoint = f"{STRIPE_API_URL}/api/payments/subscription?userId={quote(user_id)}"
    headers = {
        'Accept': 'application/json',
    }
    headers['X-Internal-Api-Key'] = PAYMENT_INTERNAL_API_KEY

    request = Request(endpoint, method='DELETE', headers=headers)
    try:
        with urlopen(request, timeout=4) as response:
            raw = response.read().decode('utf-8')
            data = json.loads(raw) if raw else {}
            return {
                'attempted': True,
                'deleted': bool(data.get('deleted', False)),
                'statusCode': response.status
            }
    except HTTPError as e:
        error_body = e.read().decode('utf-8', errors='replace')
        return {
            'attempted': True,
            'deleted': False,
            'statusCode': e.code,
            'error': error_body[:300]
        }
    except URLError as e:
        return {
            'attempted': True,
            'deleted': False,
            'error': str(e.reason)
        }


def lambda_handler(event, context):
    """
    Main Lambda entry point - permanently deletes a user from Cognito.
    
    Args:
        event: API Gateway event with username in query params or body
        context: AWS Lambda context object
    
    Returns:
        dict: API Gateway response with success/failure message
    """
    # Handle CORS preflight
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': ''
        }

    user_pool_id = os.environ.get('USER_POOL_ID')
    if not user_pool_id:
        return {
            'statusCode': 500,
            'headers': CORS_HEADERS,
            'body': json.dumps({'error': 'USER_POOL_ID environment variable is not set'})
        }
    # 1. Verify admin group membership
    claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
    groups = claims.get('cognito:groups', '')

    if not user_in_admin_group(groups):
        return {
            'statusCode': 403,
            'headers': CORS_HEADERS,
            'body': json.dumps({'error': 'Admin access required'})
        }
    
    # Debug logging
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
        cognito_sub = None

        # 2. Get username from query parameters first (for DELETE requests)
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
        
        # 3. Validate username
        if not username:
            return {
                'statusCode': 400,
                'headers': CORS_HEADERS,
                'body': json.dumps({'error': 'Username is required'})
            }

        # 4. Resolve Cognito 'sub' before deleting user (for SQL cleanup)
        try:
            user_response = cognito.admin_get_user(
                UserPoolId=user_pool_id,
                Username=username
            )
            cognito_sub = get_attribute(user_response.get('UserAttributes', []), 'sub')
        except Exception as e:
            print(f"Warning: Failed to resolve Cognito sub for {username}: {e}")
        
        # 5. Delete user from Cognito
        print(f"Attempting to delete user: {username}")
        print(f"Using USER_POOL_ID: {user_pool_id}")
        
        cognito.admin_delete_user(
            UserPoolId=user_pool_id,
            Username=username
        )
        
        print(f"SUCCESS: User {username} deleted successfully")

        # 6. Best-effort cleanup of SQL subscription state
        sql_cleanup = delete_sql_subscription(cognito_sub)
        print(f"SQL cleanup result for {username} ({cognito_sub}): {sql_cleanup}")

        # 7. Return success response
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({
                'message': f'User {username} deleted successfully',
                'username': username,
                'cognitoSub': cognito_sub,
                'sqlCleanup': sql_cleanup
            })
        }
        
    except cognito.exceptions.UserNotFoundException:
        print(f"ERROR: User {username} not found in Cognito")
        return {
            'statusCode': 404,
            'headers': CORS_HEADERS,
            'body': json.dumps({'error': 'User not found'})
        }
    except Exception as e:
        print(f"ERROR deleting user: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        return {
            'statusCode': 500,
            'headers': CORS_HEADERS,
            'body': json.dumps({'error': str(e)})
        }
