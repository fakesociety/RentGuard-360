import json
import boto3
from datetime import datetime
import uuid

bedrock = boto3.client(service_name='bedrock-runtime', region_name='us-east-1')
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('RentGuard-Contracts')

# Use same model as ai-analyzer (Claude Haiku 4.5)
MODEL_ID = "us.anthropic.claude-haiku-4-5-20251001-v1:0"

def lambda_handler(event, context):
    """
    ConsultClause - Explains legal clauses in simple terms.
    Focus: EXTREMELY CONCISE explanation (Max 3 lines).
    """
    try:
        # 1. Parse request body
        body = json.loads(event.get('body', '{}'))
        contract_id = body.get('contractId')
        clause_text = body.get('clauseText')
        
        if not clause_text:
            return {
                'statusCode': 400,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'No clause text provided'})
            }

        # 2. Build prompt for AI - UPDATED FOR BREVITY
        # השינוי: הנחיה לסיכום בפסקה אחת קצרה בלבד
        system_prompt = """You are a concise legal interpreter.
Your goal is to explain the clause in simple Hebrew in ONE short paragraph.
CONSTRAINT: Maximum 3 sentences.
Do NOT use bullet points. Do NOT use numbered lists.
Focus only on the practical meaning."""

        user_message = {
            "role": "user",
            "content": [{
                "text": f"""הסבר את סעיף השכירות הבא בקיצור נמרץ (עד 3 משפטים):
"{clause_text}"

כתוב רק את השורה התחתונה: מה זה אומר תכל'ס בשפה פשוטה וביומיומית. בלי הקדמות ובלי דוגמאות ארוכות."""
            }]
        }

        # 3. Call Bedrock (Claude Haiku 4.5)
        response = bedrock.converse(
            modelId=MODEL_ID,
            system=[{"text": system_prompt}],
            messages=[user_message],
            inferenceConfig={"maxTokens": 300, "temperature": 0.3} 
        )
        
        ai_answer = response['output']['message']['content'][0]['text']

        # 5. Return AI response
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            'body': json.dumps({'explanation': ai_answer})
        }

    except Exception as e:
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }