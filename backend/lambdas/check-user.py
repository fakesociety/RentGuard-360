"""
=============================================================================
LAMBDA: check-user
Verifies if a user exists in Cognito and returns their current state.
Used to provide better UX during signup (Sign In vs. Verify instructions).
=============================================================================

Trigger: API Gateway (GET /auth/check-user)
Input: Query parameter 'email'
Output: JSON object with { status: 'EXISTS' | 'NEEDS_VERIFICATION' | 'SOCIAL_ONLY' | 'USER_NOT_FOUND' }

Security:
  - Uses admin_get_user for definitive state check.
  - Requires valid API Key (configured in API Gateway).

=============================================================================
"""

import json
import os
import boto3
import re

# Configuration
cognito = boto3.client('cognito-idp')
USER_POOL_ID = os.environ.get('USER_POOL_ID')

def cors_headers():
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Api-Key,Authorization',
        'Access-Control-Allow-Methods': 'GET,OPTIONS'
    }

def lambda_handler(event, context):
    # Handle CORS preflight
    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': cors_headers(),
            'body': ''
        }

    try:
        # 1. Get email from query parameters
        params = event.get('queryStringParameters') or {}
        email = params.get('email', '').strip().lower()

        if not email or not re.match(r"[^@]+@[^@]+\.[^@]+", email):
            return {
                'statusCode': 400,
                'headers': cors_headers(),
                'body': json.dumps({'error': 'Valid email is required'})
            }

        if not USER_POOL_ID:
            return {
                'statusCode': 500,
                'headers': cors_headers(),
                'body': json.dumps({'error': 'USER_POOL_ID environment variable not set'})
            }

        # 2. Check user in Cognito
        try:
            response = cognito.admin_get_user(
                UserPoolId=USER_POOL_ID,
                Username=email
            )
            
            user_status = response.get('UserStatus')
            print(f"User {email} found with status: {user_status}")

            # Determine simplified status for frontend
            if user_status == 'UNCONFIRMED':
                status = 'NEEDS_VERIFICATION'
            elif user_status == 'EXTERNAL_PROVIDER':
                # Email belongs to social login identity; native signup should route to social auth UI.
                status = 'SOCIAL_ONLY'
            else:
                status = 'EXISTS'

            return {
                'statusCode': 200,
                'headers': cors_headers(),
                'body': json.dumps({
                    'status': status,
                    'email': email
                })
            }

        except cognito.exceptions.UserNotFoundException:
            print(f"User {email} not found")
            return {
                'statusCode': 200,
                'headers': cors_headers(),
                'body': json.dumps({
                    'status': 'USER_NOT_FOUND',
                    'email': email
                })
            }

    except Exception as e:
        print(f"Error checking user: {str(e)}")
        return {
            'statusCode': 500,
            'headers': cors_headers(),
            'body': json.dumps({'error': 'Internal server error'})
        }
