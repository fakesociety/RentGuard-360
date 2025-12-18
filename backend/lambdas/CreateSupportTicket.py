import json
import boto3
import uuid
import time
import logging
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# === Services ===
ses_client = boto3.client('ses', region_name='us-east-1')
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')

# === Configuration ===
TABLE_NAME = 'SupportTickets'
SENDER_EMAIL = "projForruppin@gmail.com"  # Verified sender email
SUPPORT_TEAM_EMAIL = "projForruppin@gmail.com"  # Verified recipient email

def lambda_handler(event, context):
    # CORS headers for frontend connection
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'OPTIONS,POST'
    }

    if event['httpMethod'] == 'OPTIONS':
        return {'statusCode': 200, 'headers': headers, 'body': ''}

    try:
        body = json.loads(event.get('body', '{}'))
        user_email = body.get('user_email')
        category = body.get('category', 'General')
        message_content = body.get('message')
        contract_id = body.get('contract_id', 'N/A')
        
        if not user_email or not message_content:
            return {'statusCode': 400, 'headers': headers, 'body': json.dumps({'error': 'Missing email or message'})}

        # Generate unique ticket ID
        ticket_id = str(uuid.uuid4())
        timestamp = int(time.time())
        date_str = time.strftime('%Y-%m-%d %H:%M:%S', time.gmtime(timestamp))

        # Save to DynamoDB
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

        # Send email via SES
        email_subject = f"📢 פנייה חדשה: {category}"
        email_body = f"""
        <h2>פניית תמיכה חדשה</h2>
        <p><strong>מאת:</strong> {user_email}</p>
        <p><strong>תוכן:</strong> {message_content}</p>
        <p><strong>מזהה פנייה:</strong> {ticket_id}</p>
        <hr>
        <p>לחץ "השב" כדי לענות ללקוח.</p>
        """

        ses_client.send_email(
            Source=SENDER_EMAIL,
            Destination={'ToAddresses': [SUPPORT_TEAM_EMAIL]},
            Message={
                'Subject': {'Data': email_subject, 'Charset': 'UTF-8'},
                'Body': {'Html': {'Data': email_body, 'Charset': 'UTF-8'}}
            },
            ReplyToAddresses=[user_email]
        )

        return {
            'statusCode': 200,
            'headers': headers,
            'body': json.dumps({'message': 'Ticket created', 'ticketId': ticket_id})
        }

    except Exception as e:
        logger.error(f"Error: {str(e)}")
        return {'statusCode': 500, 'headers': headers, 'body': json.dumps({'error': str(e)})}
