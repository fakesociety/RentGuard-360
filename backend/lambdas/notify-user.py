import json
import boto3

# Clients
ses = boto3.client('ses', region_name='us-east-1')
cognito = boto3.client('cognito-idp', region_name='us-east-1')

# ==========================================
# Configuration - Update these values:
# ==========================================
# 1. The email you verified in SES Console (sender)
SENDER_EMAIL = "powe3k@gmail.com" 

# 2. Your Cognito User Pool ID (looks like us-east-1_xxxx)
USER_POOL_ID = "us-east-1_rwsncOnh1"
# ==========================================

def get_user_email(user_id):
    """Fetch user's email from Cognito by User ID"""
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

def lambda_handler(event, context):
    try:
        print("Starting NotifyUser...", json.dumps(event))
        
        # Get data from previous step (SaveResults)
        user_id = event.get('userId')
        contract_id = event.get('contractId')
        risk_score = event.get('risk_score', 0)
        
        # Skip if no valid user
        if not user_id or user_id in ['guest', 'unknown', 'anonymous', None]:
            print("Skipping email: No valid user ID.")
            return {'status': 'skipped', 'reason': 'guest_user'}

        # 1. Get recipient email from Cognito
        recipient_email = get_user_email(user_id)
        
        if not recipient_email:
            print("Skipping email: Could not find email address in Cognito.")
            return {'status': 'failed', 'reason': 'email_not_found'}

        # 2. Build HTML email
        subject = f"RentGuard: תוצאות הניתוח לחוזה שלך (ציון: {risk_score})"
        
        # Color based on risk score: red if high, green if low
        color = "#d9534f" if risk_score > 50 else "#5cb85c"
        
        body_html = f"""
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

        # 3. Send email via SES
        # Note: In Sandbox mode, recipient email must also be verified!
        ses.send_email(
            Source=SENDER_EMAIL,
            Destination={'ToAddresses': [recipient_email]},
            Message={
                'Subject': {'Data': subject, 'Charset': 'UTF-8'},
                'Body': {'Html': {'Data': body_html, 'Charset': 'UTF-8'}}
            }
        )
        
        print(f"Email sent successfully to {recipient_email}")
        return {'status': 'success', 'recipient': recipient_email}

    except Exception as e:
        print(f"Error sending email: {str(e)}")
        # Don't fail the Step Function because of email error
        return {'status': 'error', 'message': str(e)}
