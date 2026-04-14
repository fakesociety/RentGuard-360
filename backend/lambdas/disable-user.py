"""
=============================================================================
LAMBDA: disable-user
Disables a user in Cognito and sends notification email (admin only)
=============================================================================

Trigger: API Gateway (POST /admin/users/disable)
Input: JSON body with username and optional reason
Output: Success/failure message with email sent status

External Services:
  - Cognito: Disable user, get user email
  - SES: Send notification email

Security:
  - Requires 'Admins' group membership in Cognito
  - Returns 403 if user is not an admin

=============================================================================
"""

# =============================================================================
# IMPORTS
# =============================================================================

import json
import os
import boto3
import traceback

# =============================================================================
# CONFIGURATION
# =============================================================================

cognito = boto3.client('cognito-idp')
ses = boto3.client('ses')

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def cors_headers():
    """Returns standard CORS headers for API Gateway responses."""
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
    }


def user_in_admin_group(raw_groups):
    """Safely check whether Cognito groups include exactly 'Admins'."""
    if isinstance(raw_groups, list):
        return any(str(group).strip() == 'Admins' for group in raw_groups)

    groups_text = str(raw_groups or '').strip()
    if not groups_text:
        return False

    try:
        parsed = json.loads(groups_text)
        if isinstance(parsed, list):
            return any(str(group).strip() == 'Admins' for group in parsed)
    except Exception:
        pass

    normalized = groups_text.replace('[', '').replace(']', '').replace('"', '')
    parts = [part.strip() for part in normalized.split(',') if part.strip()]
    return 'Admins' in parts


def send_disable_notification(sender_email, email, reason):
    """
    Sends notification email to user about account suspension.
    
    Args:
        email: User's email address
        reason: Reason for suspension
    
    Returns:
        bool: True if email sent successfully, False otherwise
    """
    try:
        if not sender_email:
            return False
        ses.send_email(
            Source=sender_email,
            Destination={'ToAddresses': [email]},
            Message={
                'Subject': {
                    'Data': 'RentGuard 360 - Account Disabled',
                    'Charset': 'UTF-8'
                },
                'Body': {
                    'Html': {
                        'Data': f'''<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#eef2f7;">
                                                <div dir="rtl" style="margin:0; padding:24px 12px; background:#eef2f7; font-family: Arial, Helvetica, sans-serif;">
                                                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:640px; margin:0 auto; background:#ffffff; border:1px solid #dbe4ee; border-radius:14px; overflow:hidden;">
                                                        <tr>
                                                            <td style="padding:18px 22px; background:#ffffff; border-bottom:1px solid #e6edf4;">
                                                                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                                                    <tr>
                                                                        <td style="padding-left:8px; line-height:0;">
                                                                            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0f9f6e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Shield">
                                                                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path>
                                                                            </svg>
                                                                        </td>
                                                                        <td style="font-weight:800; font-size:22px; color:#0ea5a4; letter-spacing:0.2px;">360</td>
                                                                        <td style="font-weight:800; font-size:22px; color:#0f9f6e; letter-spacing:0.2px; padding-left:4px;">RentGuard</td>
                                                                    </tr>
                                                                </table>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td style="padding:26px 22px 12px; color:#0f172a;">
                                                                <h2 style="margin:0 0 10px; font-size:24px; line-height:1.35; color:#b91c1c;">החשבון שלך הושעה</h2>
                                                                <p style="margin:0; font-size:15px; line-height:1.7; color:#334155;">חשבון ה-RentGuard 360 שלך הושעה על ידי מנהל המערכת.</p>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td style="padding:0 22px 16px;">
                                                                <div style="border:1px solid #fecaca; border-radius:12px; background:#fff1f2; padding:14px; color:#7f1d1d; font-size:14px; line-height:1.7;">
                                                                    <strong>סיבה:</strong> {reason}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td style="padding:0 22px 12px; color:#334155; font-size:15px; line-height:1.7;">
                                                                אם זו טעות, אפשר לפנות לתמיכה ונשמח לעזור.
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td style="padding:14px 22px 18px; border-top:1px solid #e6edf4; font-size:12px; color:#64748b;">הודעה זו נשלחה אוטומטית ממערכת RentGuard 360.</td>
                                                        </tr>
                                                    </table>
                                                </div>
</body>
</html>
                        ''',
                        'Charset': 'UTF-8'
                    }
                }
            }
        )
        return True
    except Exception as e:
        print(f"Email send failed: {e}")
        return False

# =============================================================================
# MAIN HANDLER
# =============================================================================

def lambda_handler(event, context):
    """
    Main Lambda entry point - disables a user in Cognito.
    
    Args:
        event: API Gateway event with JSON body containing:
               - username (required): Cognito username
               - reason (optional): Reason for disabling
        context: AWS Lambda context object
    
    Returns:
        dict: API Gateway response with success/failure message
    """
    try:
        # Handle CORS preflight
        if event.get('httpMethod') == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': cors_headers(),
                'body': ''
            }

        user_pool_id = os.environ.get('USER_POOL_ID')
        if not user_pool_id:
            return {
                'statusCode': 500,
                'headers': cors_headers(),
                'body': json.dumps({'error': 'USER_POOL_ID environment variable is not set'})
            }

        sender_email = os.environ.get('SENDER_EMAIL')

        # 1. Verify admin group membership
        claims = event.get('requestContext', {}).get('authorizer', {}).get('claims', {})
        groups = claims.get('cognito:groups', '')

        if not user_in_admin_group(groups):
            return {
                'statusCode': 403,
                'headers': cors_headers(),
                'body': json.dumps({'error': 'Admin access required'})
            }
        
        # 2. Parse request body
        body = json.loads(event.get('body', '{}'))
        username = body.get('username')
        reason = body.get('reason', 'Policy violation')
        
        if not username:
            return {
                'statusCode': 400,
                'headers': cors_headers(),
                'body': json.dumps({'error': 'Username is required'})
            }
        
        # 3. Get user email before disabling
        user_email = None
        try:
            user_response = cognito.admin_get_user(
                UserPoolId=user_pool_id,
                Username=username
            )
            for attr in user_response.get('UserAttributes', []):
                if attr['Name'] == 'email':
                    user_email = attr['Value']
                    break
        except cognito.exceptions.UserNotFoundException:
            return {
                'statusCode': 404,
                'headers': cors_headers(),
                'body': json.dumps({'error': 'User not found'})
            }
        
        # 4. Disable the user in Cognito
        cognito.admin_disable_user(
            UserPoolId=user_pool_id,
            Username=username
        )
        
        # 5. Send notification email
        email_sent = False
        if user_email and sender_email:
            email_sent = send_disable_notification(sender_email, user_email, reason)
        elif user_email and not sender_email:
            print('Skipping email notification: SENDER_EMAIL environment variable is not set')
        
        # 6. Return success response
        return {
            'statusCode': 200,
            'headers': cors_headers(),
            'body': json.dumps({
                'success': True,
                'message': f'User {username} has been disabled',
                'emailSent': email_sent
            })
        }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        traceback.print_exc()
        return {
            'statusCode': 500,
            'headers': cors_headers(),
            'body': json.dumps({'error': str(e)})
        }
