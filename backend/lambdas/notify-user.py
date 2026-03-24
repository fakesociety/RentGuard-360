"""
=============================================================================
LAMBDA: notify-user
Sends email notification to user when contract analysis is complete
=============================================================================

Trigger: Step Functions (final step after save-results)
Input: userId, contractId, risk_score from previous step
Output: Status of email send (success/skipped/failed)

External Services:
  - SES: Send analysis completion email
  - Cognito: Fetch user email by user ID

Notes:
  - Skips if user is guest/anonymous
  - Does not fail the Step Function if email fails

=============================================================================
"""

# =============================================================================
# IMPORTS
# =============================================================================

import json
import os
import boto3

# =============================================================================
# CONFIGURATION
# =============================================================================

ses = boto3.client('ses')
cognito = boto3.client('cognito-idp')

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def get_user_email(user_pool_id, user_id):
    """
    Fetch user's email from Cognito by User ID.
    
    Args:
        user_id: Cognito username (sub)
    
    Returns:
        str: User's email or None if not found
    """
    try:
        # First try: treat user_id as Cognito Username (works when Username == sub)
        response = cognito.admin_get_user(UserPoolId=user_pool_id, Username=user_id)
        for attr in response.get('UserAttributes', []):
            if attr.get('Name') == 'email':
                return attr.get('Value')
    except Exception as e:
        print(f"Warning: admin_get_user failed for '{user_id}' (may not be Username): {e}")

    # Fallback: lookup by sub attribute (works when Username is email/phone/etc.)
    try:
        resp = cognito.list_users(
            UserPoolId=user_pool_id,
            Filter=f'sub = "{user_id}"',
            Limit=1,
        )
        users = resp.get('Users') or []
        if not users:
            return None
        attrs = users[0].get('Attributes', [])
        for attr in attrs:
            if attr.get('Name') == 'email':
                return attr.get('Value')
    except Exception as e:
        print(f"Warning: list_users fallback failed for sub '{user_id}': {e}")
        return None

    return None


def build_notification_email(risk_score):
    """
    Build HTML email content for analysis notification.
    
    Args:
        risk_score: Contract risk score (0-100)
    
    Returns:
        str: HTML email body
    """
    def _to_score(value):
        try:
            score = float(value)
        except Exception:
            score = 0.0
        if score < 0:
            score = 0.0
        if score > 100:
            score = 100.0
        return score

    def _score_color(score):
        # Match frontend/admin legend:
        # 0-50 (high risk) red, 51-70 orange, 71-85 light green, 86-100 green
        if score >= 86:
            return "#22c55e"  # green
        if score >= 71:
            return "#10b981"  # light green
        if score >= 51:
            return "#f59e0b"  # orange
        return "#ef4444"      # red

    score = _to_score(risk_score)
    color = _score_color(score)
    
    return f"""
    <div dir="rtl" style="margin:0; padding:24px 12px; background:#eef2f7; font-family: Arial, Helvetica, sans-serif;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:640px; margin:0 auto; background:#ffffff; border:1px solid #dbe4ee; border-radius:14px; overflow:hidden;">
            <tr>
                <td style="padding:18px 22px; background:#ffffff; border-bottom:1px solid #e6edf4;">
                                        <div style="display:flex; align-items:center; gap:8px;">
                                                <span style="display:inline-flex; width:22px; height:22px; line-height:0;">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0f9f6e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Shield">
                                                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"></path>
                                                    </svg>
                                                </span>
                        <span style="font-weight:800; font-size:22px; color:#0f9f6e; letter-spacing:0.2px;">RentGuard</span>
                        <span style="font-weight:800; font-size:22px; color:#0ea5a4; letter-spacing:0.2px;">360</span>
                    </div>
                </td>
            </tr>

            <tr>
                <td style="padding:26px 22px 18px; color:#0f172a;">
                    <h2 style="margin:0 0 10px; font-size:24px; line-height:1.35; color:#0f172a;">הניתוח הסתיים בהצלחה</h2>
                    <p style="margin:0; font-size:15px; line-height:1.7; color:#334155;">
                        חוזה השכירות שלך נותח בהצלחה במערכת RentGuard 360.
                    </p>
                </td>
            </tr>

            <tr>
                <td style="padding:0 22px 16px;">
                    <div style="border:1px solid #dbe4ee; border-radius:12px; background:#f8fafc; text-align:center; padding:16px;">
                        <div style="font-size:14px; color:#475569; margin-bottom:8px;">ציון הסיכון המשוקלל</div>
                        <div style="font-size:40px; font-weight:800; line-height:1.1; color:{color};">{int(round(score))}/100</div>
                    </div>
                </td>
            </tr>

            <tr>
                <td style="padding:0 22px 10px; color:#334155; font-size:15px; line-height:1.7;">
                    היכנס לאתר כדי לראות את הפירוט המלא, ההסברים והטיפים למשא ומתן.
                </td>
            </tr>

            <tr>
                <td style="padding:14px 22px 18px; border-top:1px solid #e6edf4; font-size:12px; color:#64748b;">
                    הודעה זו נשלחה אוטומטית ממערכת RentGuard 360.
                </td>
            </tr>
        </table>
    </div>
    """


def build_notification_text(risk_score):
    """Build plain-text fallback (helps deliverability and non-HTML clients)."""
    return (
        "הניתוח הסתיים בהצלחה!\n"
        f"ציון הסיכון המשוקלל: {risk_score}/100\n\n"
        "היכנס לאתר כדי לראות את הפירוט המלא.\n"
        "הודעה זו נשלחה אוטומטית.\n"
    )

# =============================================================================
# MAIN HANDLER
# =============================================================================

def lambda_handler(event, context):
    """
    Main Lambda entry point - sends analysis completion email.
    
    Args:
        event: Step Functions event with userId, contractId, risk_score
        context: AWS Lambda context object
    
    Returns:
        dict: Status of email send operation
    """
    try:
        # Handle CORS preflight (defensive; Step Functions won't send OPTIONS)
        if event.get('httpMethod') == 'OPTIONS':
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                    'Access-Control-Allow-Methods': 'POST,OPTIONS',
                },
                'body': ''
            }

        print("Starting NotifyUser...", json.dumps(event))

        sender_email = os.environ.get('SENDER_EMAIL')
        if not sender_email:
            print("Skipping email: SENDER_EMAIL environment variable is not set.")
            return {'status': 'skipped', 'reason': 'missing_sender_email'}

        user_pool_id = os.environ.get('USER_POOL_ID')
        if not user_pool_id:
            print("Skipping email: USER_POOL_ID environment variable is not set.")
            return {'status': 'skipped', 'reason': 'missing_user_pool_id'}
        
        # 1. Get data from previous step (SaveResults)
        user_id = event.get('userId')
        risk_score = event.get('risk_score', 0)
        
        # 2. Skip if no valid user
        if not user_id or user_id in ['guest', 'unknown', 'anonymous', None]:
            print("Skipping email: No valid user ID.")
            return {'status': 'skipped', 'reason': 'guest_user'}

        # 3. Get recipient email from Cognito
        recipient_email = get_user_email(user_pool_id, user_id)
        
        if not recipient_email:
            print("Skipping email: Could not find email address in Cognito.")
            return {'status': 'failed', 'reason': 'email_not_found'}

        # 4. Build and send email (Hebrew subject)
        subject = f"RentGuard: תוצאות הניתוח לחוזה שלך (ציון: {risk_score})"
        body_html = build_notification_email(risk_score)

        ses.send_email(
            Source=sender_email,
            Destination={'ToAddresses': [recipient_email]},
            Message={
                'Subject': {'Data': subject, 'Charset': 'UTF-8'},
                'Body': {
                    'Html': {'Data': body_html, 'Charset': 'UTF-8'},
                    'Text': {'Data': build_notification_text(risk_score), 'Charset': 'UTF-8'},
                }
            }
        )
        
        print(f"Email sent successfully to {recipient_email}")
        return {'status': 'success', 'recipient': recipient_email}

    except Exception as e:
        print(f"Error sending email: {str(e)}")
        # Don't fail the Step Function because of email error
        return {'status': 'error', 'message': str(e)}
