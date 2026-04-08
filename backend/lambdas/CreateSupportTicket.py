"""
=============================================================================
LAMBDA: CreateSupportTicket
Creates support tickets and sends email notifications
=============================================================================

Trigger: API Gateway (POST /support)
Input: JSON body with user_email, category, message, contract_id
Output: Ticket ID and success message

DynamoDB Tables:
  - SupportTickets: Store ticket data

External Services:
  - SES: Send email to support team and confirmation to user

=============================================================================
"""

# =============================================================================
# IMPORTS
# =============================================================================

import json
import os
import boto3
import uuid
import time
import logging
from botocore.exceptions import ClientError

# =============================================================================
# CONFIGURATION
# =============================================================================

TABLE_NAME = os.environ.get('SUPPORT_TICKETS_TABLE', 'SupportTickets')

logger = logging.getLogger()
logger.setLevel(logging.INFO)

ses_client = boto3.client('ses')
dynamodb = boto3.resource('dynamodb')

# Standard CORS headers
CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'OPTIONS,POST'
}

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def build_admin_email(ticket_id, user_email, category, message_content):
    """
    Build HTML email for support team notification.
    
    Args:
        ticket_id: Unique ticket ID
        user_email: User's email
        category: Ticket category
        message_content: Ticket message
    
    Returns:
        str: HTML email body
    """
    return f"""
    <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="text-align: center; padding: 30px 20px; background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🛡️ פנייה חדשה</h1>
        </div>
        <div style="padding: 30px; text-align: center;">
            <h2 style="color: #10b981; margin: 0 0 10px 0; font-size: 24px;">היי, התקבלה פנייה חדשה!</h2>
            <p style="color: #6b7280; margin: 0 0 25px 0; font-size: 14px;">מספר פנייה: {ticket_id[:8]}</p>
            
            <div style="background: #f9fafb; border-radius: 12px; padding: 20px; text-align: right; margin-bottom: 20px;">
                <p style="margin: 8px 0;"><strong>מאת:</strong> {user_email}</p>
                <p style="margin: 8px 0;"><strong>קטגוריה:</strong> {category}</p>
                <p style="margin: 8px 0;"><strong>תוכן:</strong></p>
                <p style="background: #ffffff; padding: 12px; border-radius: 8px; border-right: 3px solid #10b981;">{message_content}</p>
            </div>
            
            <p style="color: #6b7280; font-size: 13px;">לחץ "השב" כדי לענות ללקוח.</p>
        </div>
        <div style="text-align: center; padding: 20px; background: #f9fafb; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; margin: 0; font-size: 12px;">RentGuard Systems</p>
        </div>
    </div>
    """


def build_user_confirmation_email(ticket_id, category, message_content):
    """
    Build HTML confirmation email for user.
    
    Args:
        ticket_id: Unique ticket ID
        category: Ticket category
        message_content: Ticket message
    
    Returns:
        str: HTML email body
    """
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
                            <span style="font-weight:800; font-size:22px; color:#0ea5a4; letter-spacing:0.2px;">360</span>
                            <span style="font-weight:800; font-size:22px; color:#0f9f6e; letter-spacing:0.2px;">RentGuard</span>
                        </div>
                    </td>
                </tr>
                <tr>
                    <td style="padding:26px 22px 8px; color:#0f172a;">
                        <h2 style="margin:0 0 10px; font-size:24px; line-height:1.35; color:#0f172a;">הפנייה התקבלה בהצלחה</h2>
                        <p style="margin:0; font-size:15px; line-height:1.7; color:#334155;">מספר הפנייה שלך הוא <strong>{ticket_id[:8]}</strong>. נחזור אליך בתוך 24 שעות.</p>
                    </td>
                </tr>
                <tr>
                    <td style="padding:12px 22px 16px;">
                        <div style="background:#f8fafc; border:1px solid #dbe4ee; border-radius:12px; padding:14px; text-align:right; color:#334155;">
                            <p style="margin:0 0 8px;"><strong>קטגוריה:</strong> {category}</p>
                            <p style="margin:0 0 6px;"><strong>תוכן הפנייה:</strong></p>
                            <p style="margin:0; background:#ffffff; border:1px solid #e6edf4; border-radius:8px; padding:10px;">{message_content}</p>
                        </div>
                    </td>
                </tr>
                <tr>
                    <td style="padding:14px 22px 18px; border-top:1px solid #e6edf4; font-size:12px; color:#64748b;">הודעה זו נשלחה אוטומטית ממערכת RentGuard 360.</td>
                </tr>
            </table>
        </div>
    """

# =============================================================================
# MAIN HANDLER
# =============================================================================

def lambda_handler(event, context):
    """
    Main Lambda entry point - creates support ticket and sends emails.
    
    Args:
        event: API Gateway event with JSON body containing:
               - user_email (required)
               - message (required)
               - category (optional, default: 'General')
               - contract_id (optional)
        context: AWS Lambda context object
    
    Returns:
        dict: API Gateway response with ticket ID
    """
    # Handle CORS preflight
    if event['httpMethod'] == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS_HEADERS, 'body': ''}

    try:
        sender_email = os.environ.get('SENDER_EMAIL')
        support_team_email = os.environ.get('SUPPORT_TEAM_EMAIL') or sender_email

        # 1. Parse request body
        body = json.loads(event.get('body', '{}'))
        user_email = body.get('user_email')
        category = body.get('category', 'General')
        message_content = body.get('message')
        contract_id = body.get('contract_id', 'N/A')
        
        if not user_email or not message_content:
            return {
                'statusCode': 400,
                'headers': CORS_HEADERS,
                'body': json.dumps({'error': 'Missing email or message'})
            }

        # 2. Generate ticket data
        ticket_id = str(uuid.uuid4())
        timestamp = int(time.time())
        date_str = time.strftime('%Y-%m-%d %H:%M:%S', time.gmtime(timestamp))

        # 3. Save to DynamoDB
        table = dynamodb.Table(TABLE_NAME)
        item = {
            'ticketId': ticket_id,
            'userEmail': user_email,
            'category': category,
            'message': message_content,
            'contractId': contract_id,
            'status': 'OPEN',
            'createdAt': timestamp,
            'createdAtReadable': date_str
        }
        table.put_item(Item=item)

        # 4. Send email to support team (best-effort; don't fail ticket creation)
        if sender_email and support_team_email:
            admin_email_body = build_admin_email(ticket_id, user_email, category, message_content)
            ses_client.send_email(
                Source=sender_email,
                Destination={'ToAddresses': [support_team_email]},
                Message={
                    'Subject': {'Data': f"🛡️ פנייה חדשה: {category} (מס' {ticket_id[:8]})", 'Charset': 'UTF-8'},
                    'Body': {'Html': {'Data': admin_email_body, 'Charset': 'UTF-8'}}
                },
                ReplyToAddresses=[user_email]
            )
        else:
            logger.warning('Skipping support-team email: SENDER_EMAIL / SUPPORT_TEAM_EMAIL environment variables are not set')

        # 5. Send confirmation to user (best-effort; don't fail ticket creation)
        try:
            if sender_email:
                user_email_body = build_user_confirmation_email(ticket_id, category, message_content)
                ses_client.send_email(
                    Source=sender_email,
                    Destination={'ToAddresses': [user_email]},
                    Message={
                        'Subject': {'Data': f"✅ קיבלנו את הפנייה שלך (מס' {ticket_id[:8]})", 'Charset': 'UTF-8'},
                        'Body': {'Html': {'Data': user_email_body, 'Charset': 'UTF-8'}}
                    }
                )
                logger.info(f"Confirmation email sent to {user_email}")
            else:
                logger.warning('Skipping user confirmation email: SENDER_EMAIL environment variable is not set')
        except ClientError as e:
            # Don't fail if user email fails (sandbox mode)
            logger.warning(f"Could not send confirmation to user: {e}")

        # 6. Return success
        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({'message': 'Ticket created', 'ticketId': ticket_id})
        }

    except Exception as e:
        logger.error(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': CORS_HEADERS,
            'body': json.dumps({'error': str(e)})
        }
