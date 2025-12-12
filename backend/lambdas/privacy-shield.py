import re
import json

def lambda_handler(event, context):
    try:
        # קריאה ישירה (בלי body)
        text = event.get('extractedText', '')
        contract_id = event.get('contractId', 'unknown') # חשוב להעביר את זה הלאה!
        
        if not text:
            print("Warning: No text found directly in event")
            return {'contractId': contract_id, 'sanitizedText': ''}

        # --- לוגיקת הסינון (כמו שכתבת) ---
        # Israeli ID
        text = re.sub(r'\b\d{9}\b', '[ID_REDACTED]', text)
        # Credit card
        text = re.sub(r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b', '[CC_REDACTED]', text)
        # Phone numbers
        text = re.sub(r'\b05\d-?\d{7}\b', '[PHONE_REDACTED]', text)
        # Email
        text = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '[EMAIL_REDACTED]', text)
        
        # החזרה ישירה ל-Step Functions (בלי statusCode ובלי body!)
        return {
            'contractId': contract_id,
            'sanitizedText': text,
            'redactionCount': text.count('_REDACTED]')
        }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        raise e