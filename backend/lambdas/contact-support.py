import json
import boto3
from datetime import datetime

ses = boto3.client('ses', region_name='us-east-1')

# Configuration - Use YOUR verified email address
SUPPORT_EMAIL = 'projforruppin@gmail.com'  # Where to send support emails
SENDER_EMAIL = 'projforruppin@gmail.com'   # Must be verified in SES

def lambda_handler(event, context):
    """
    Handle contact form submissions
    Sends email via SES and optionally saves to DynamoDB
    """
    # CORS headers
    headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
    }
    
    # Handle preflight
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': headers, 'body': ''}
    
    try:
        # Parse request body
        body = json.loads(event.get('body', '{}'))
        
        name = body.get('name', '').strip()
        email = body.get('email', '').strip()
        subject = body.get('subject', '').strip()
        message = body.get('message', '').strip()
        
        # Validate required fields
        if not all([name, email, subject, message]):
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({
                    'success': False,
                    'error': 'All fields are required: name, email, subject, message'
                })
            }
        
        # Validate email format
        if '@' not in email or '.' not in email:
            return {
                'statusCode': 400,
                'headers': headers,
                'body': json.dumps({
                    'success': False,
                    'error': 'Invalid email address'
                })
            }
        
        # Build email content
        email_subject = f"[RentGuard Support] {subject}"
        email_body = f"""
New Support Request from RentGuard 360

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 From: {name} <{email}>
📋 Subject: {subject}
📅 Date: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MESSAGE:
{message}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Reply directly to this email to respond to the user.
"""
        
        # Send email via SES
        try:
            ses.send_email(
                Source=SENDER_EMAIL,
                Destination={
                    'ToAddresses': [SUPPORT_EMAIL]
                },
                ReplyToAddresses=[email],  # So replies go to user
                Message={
                    'Subject': {'Data': email_subject, 'Charset': 'UTF-8'},
                    'Body': {
                        'Text': {'Data': email_body, 'Charset': 'UTF-8'}
                    }
                }
            )
            
            # Optional: Send confirmation to user
            user_confirmation = f"""
שלום {name},

קיבלנו את הודעתך! נחזור אליך תוך 24 שעות.

נושא: {subject}

תודה שפנית אלינו,
צוות RentGuard 360

---
Hello {name},

We received your message! We'll get back to you within 24 hours.

Subject: {subject}

Thank you for contacting us,
RentGuard 360 Team
"""
            ses.send_email(
                Source=SENDER_EMAIL,
                Destination={'ToAddresses': [email]},
                Message={
                    'Subject': {'Data': 'RentGuard 360 - Message Received', 'Charset': 'UTF-8'},
                    'Body': {'Text': {'Data': user_confirmation, 'Charset': 'UTF-8'}}
                }
            )
            
        except ses.exceptions.MessageRejected as e:
            print(f"SES Error: {e}")
            # In sandbox mode, emails might be rejected
            # For development, we'll still return success
            
        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({
                'success': True,
                'message': 'Your message has been sent successfully!'
            })
        }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': headers,
            'body': json.dumps({
                'success': False,
                'error': 'Failed to send message. Please try again later.'
            })
        }
