import json
import boto3
from datetime import datetime
import uuid

bedrock = boto3.client(service_name='bedrock-runtime', region_name='us-east-1')
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('RentGuard-Contracts')

def lambda_handler(event, context):
    """
    ConsultClause - AI-powered clause explanation
    
    This Lambda allows users to ask questions about specific clauses
    in their rental contract. It uses Bedrock (Gemma AI) to provide
    explanations in Hebrew.
    
    POST body:
    - contractId: The contract ID for saving consultation history
    - clauseText: The specific clause text to explain
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

        # 2. Build prompt for AI
        prompt = f"""
        You are an expert Israeli real estate lawyer.
        The user is asking about this specific clause in their rental contract:
        "{clause_text}"
        
        Please explain in simple Hebrew:
        1. What this clause means.
        2. If it is standard or risky.
        3. A short recommendation.
        
        Keep it short and friendly.
        """

        # 3. Call Bedrock (Gemma AI)
        response = bedrock.converse(
            modelId="google.gemma-3-4b-it",
            messages=[{"role": "user", "content": [{"text": prompt}]}],
            inferenceConfig={"maxTokens": 512, "temperature": 0.7}
        )
        
        ai_answer = response['output']['message']['content'][0]['text']

        # 4. Save consultation to history (optional)
        if contract_id:
            try:
                table.update_item(
                    Key={'contractId': contract_id},
                    UpdateExpression="SET Consultations = list_append(if_not_exists(Consultations, :empty_list), :new_item)",
                    ExpressionAttributeValues={
                        ':new_item': [{
                            'id': str(uuid.uuid4()),
                            'clause': clause_text[:50],
                            'answer': ai_answer,
                            'timestamp': datetime.utcnow().isoformat()
                        }],
                        ':empty_list': []
                    }
                )
            except Exception as e:
                print(f"DB Save Warning: {e}")

        # 5. Return AI response
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            },
            'body': json.dumps({'explanation': ai_answer})
        }

    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)})
        }
