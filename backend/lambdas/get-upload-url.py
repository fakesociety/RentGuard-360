import json
import boto3
import uuid

s3 = boto3.client('s3')

# --- 🔴 חשוב! שנה את השם הזה לשם הדלי האמיתי שלך ---
BUCKET_NAME = 'rentguard-contracts-moty-101225' 
# ----------------------------------------------------

def lambda_handler(event, context):
    try:
        # 1. ניסיון לקבל את שם הקובץ המקורי מהבקשה
        query_params = event.get('queryStringParameters') or {}
        original_name = query_params.get('fileName', 'unknown.pdf')
        
        # 2. יצירת שם ייחודי לקובץ במערכת (כדי למנוע דריסות)
        # דוגמה: uploads/contract-84384-93849.pdf
        unique_id = str(uuid.uuid4())
        file_key = f"uploads/contract-{unique_id}.pdf"

        # 3. יצירת ה-Presigned URL (האישור להעלאה)
        # זהו לינק שפג תוקפו תוך 5 דקות
        presigned_url = s3.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': 'rentguard-contracts-moty-101225',
                'Key': file_key,
                'ContentType': 'application/pdf'
            },
            ExpiresIn=300
        )

        # 4. החזרת התשובה ל-Frontend
        return {
            'statusCode': 200,
            # כותרות CORS - חובה כדי שהדפדפן לא יחסום את הבקשה
            'headers': {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Headers": "Content-Type",
                "Access-Control-Allow-Methods": "OPTIONS,GET"
            },
            'body': json.dumps({
                'uploadUrl': presigned_url,
                'key': file_key, # המפתח הזה חשוב, נצטרך אותו בשלבים הבאים
                'fileName': original_name
            })
        }

    except Exception as e:
        print(f"Error generating URL: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                "Access-Control-Allow-Origin": "*",
            },
            'body': json.dumps(f"Server Error: {str(e)}")
        }