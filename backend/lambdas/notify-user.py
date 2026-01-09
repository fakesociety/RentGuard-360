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

# SES verified sender email
SENDER_EMAIL = os.environ.get('SENDER_EMAIL')
if not SENDER_EMAIL:
    raise RuntimeError('SENDER_EMAIL environment variable is not set')

# Cognito User Pool ID
USER_POOL_ID = os.environ.get('USER_POOL_ID')
if not USER_POOL_ID:
    raise RuntimeError('USER_POOL_ID environment variable is not set')

ses = boto3.client('ses')
cognito = boto3.client('cognito-idp')

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def get_user_email(user_id):
    """
    Fetch user's email from Cognito by User ID.
    
    Args:
        user_id: Cognito username (sub)
    
    Returns:
        str: User's email or None if not found
    """
    try:
        response = cognito.admin_get_user(
            UserPoolId=USER_POOL_ID,
            Username=user_id
        )
        for attr in response['UserAttributes']:
            if attr['Name'] == 'email':
                return attr['Value']
    except Exception as e:
        print(f"Warning: Could not find email for user {user_id}: {e}")
        return None


def build_notification_email(risk_score):
    """
    Build HTML email content for analysis notification.
    
    Args:
        risk_score: Contract risk score (0-100)
    
    Returns:
        str: HTML email body
    """
    # Color based on risk score: red if risky, green if safe
    color = "#d9534f" if risk_score > 50 else "#5cb85c"
    
    return f"""
    <div dir="rtl" style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px;">
        <div style="background-color: white; max-width: 600px; margin: 0 auto; padding: 20px; border-radius: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
            <h2 style="color: #333;">הניתוח הסתיים בהצלחה!</h2>
            <p>מערכת RentGuard סיימה לנתח את הקובץ שהעלית.</p>
            
            <div style="text-align: center; margin: 20px 0; padding: 15px; background-color: #f9f9f9; border-radius: 8px;">
                <h3>ציון הסיכון המשוקלל:</h3>
                <h1 style="color: {color}; margin: 0; font-size: 40px;">{risk_score}/100</h1>
            </div>

            <p>הכנס לאתר כדי לראות את הפירוט המלא, ההסברים והטיפים למשא ומתן.</p>
            <br>
            <p style="font-size: 12px; color: gray;">הודעה זו נשלחה אוטומטית.</p>
        </div>
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
        print("Starting NotifyUser...", json.dumps(event))
        
        # 1. Get data from previous step (SaveResults)
        user_id = event.get('userId')
        contract_id = event.get('contractId')
        risk_score = event.get('risk_score', 0)
        
        # 2. Skip if no valid user
        if not user_id or user_id in ['guest', 'unknown', 'anonymous', None]:
            print("Skipping email: No valid user ID.")
            return {'status': 'skipped', 'reason': 'guest_user'}

        # 3. Get recipient email from Cognito
        recipient_email = get_user_email(user_id)
        
        if not recipient_email:
            print("Skipping email: Could not find email address in Cognito.")
            return {'status': 'failed', 'reason': 'email_not_found'}

        # 4. Build and send email (Hebrew subject)
        subject = f"RentGuard: תוצאות הניתוח לחוזה שלך (ציון: {risk_score})"
        body_html = build_notification_email(risk_score)

        ses.send_email(
            Source=SENDER_EMAIL,
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
