import json
import boto3
from datetime import datetime
from decimal import Decimal

# חיבור ל-DynamoDB
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('RentGuard-Analysis')

# פונקציית עזר להמרת מספרים עשרוניים (חובה ל-DynamoDB)
def convert_floats_to_decimals(obj):
    if isinstance(obj, float):
        return Decimal(str(obj))
    elif isinstance(obj, dict):
        return {k: convert_floats_to_decimals(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_floats_to_decimals(i) for i in obj]
    return obj

def lambda_handler(event, context):
    try:
        print("Received event:", json.dumps(event))
        
        # 1. חילוץ הנתונים מהשלב הקודם
        contract_id = event.get('contractId')
        analysis_result = event.get('analysis_result')
        
        if not contract_id:
            # מנסים גיבוי למקרה שהשם שונה
            contract_id = event.get('contract_id')
        
        if not contract_id:
            raise ValueError("CRITICAL ERROR: Missing contractId in input event")
            
        if not analysis_result:
            print(f"Warning: No analysis result found for {contract_id}")
            analysis_result = {"error": "No analysis data found", "is_contract": False}

        # 2. המרה ל-Decimal
        clean_analysis = convert_floats_to_decimals(analysis_result)

        # חילוץ ציון (אם קיים)
        risk_score = 0
        if isinstance(clean_analysis, dict):
            risk_score = clean_analysis.get('overall_risk_score', 0)

        # 3. שמירה בטבלה - התיקון הקריטי כאן!
        item = {
            'contractId': contract_id,            # <--- תוקן: השם חייב להיות contractId (בלי קו תחתון)
            'timestamp': datetime.utcnow().isoformat(),
            'analysis_result': clean_analysis,
            'risk_score': risk_score,
            'status': 'COMPLETED'
        }
        
        print(f"Attempting to save item: {json.dumps(item, default=str)}")
        table.put_item(Item=item)
        print("Item saved successfully to DynamoDB")

        # 4. החזרה נקייה לשלב המייל
        return {
            'contractId': contract_id,
            'status': 'success',
            'risk_score': risk_score
        }

    except Exception as e:
        print(f"Error saving to DB: {str(e)}")
        raise e