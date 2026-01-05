import json
import boto3

# חיבור לשירות המיילים
ses = boto3.client('ses', region_name='us-east-1')

def lambda_handler(event, context):
    print("Event received from Cognito:", json.dumps(event))
    
    try:
        # בדיקה שזה רק אירוע של הרשמה חדשה (PostConfirmation)
        # לא להפעיל על Password Reset או אירועים אחרים
        trigger_source = event.get('triggerSource', '')
        
        # רק באירוע PostConfirmation_ConfirmSignUp - משתמש חדש שאימת את האימייל
        if trigger_source != 'PostConfirmation_ConfirmSignUp':
            print(f"Skipping SES verification for trigger: {trigger_source}")
            return event
        
        # חילוץ המייל של המשתמש שנרשם
        user_email = event['request']['userAttributes'].get('email')
        
        if user_email:
            print(f"Verifying email for new user: {user_email}")
            # שליחת הפקודה ל-SES לשלוח מייל אימות
            ses.verify_email_identity(EmailAddress=user_email)
            print("Verification email sent successfully.")
        else:
            print("No email found in event.")

    except Exception as e:
        # גם אם יש שגיאה, אנחנו לא רוצים לתקוע את ההרשמה
        print(f"Error: {str(e)}")
    
    # חובה! להחזיר את ה-event לקוגניטו כדי שיסיים את ההרשמה
    return event
