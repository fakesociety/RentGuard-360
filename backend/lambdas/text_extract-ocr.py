# זה הקוד שיושב ב-CloudShell תחת השם app.py (אותו העתקנו ל-text_extraction.py)
import json
import boto3
import os
import pytesseract
from pdf2image import convert_from_path
import pdfplumber
from urllib.parse import unquote_plus

s3 = boto3.client('s3')
os.environ["PATH"] += os.pathsep + "/usr/bin"

def extract_text_smart(pdf_path):
    text = ""
    num_pages = 0
    try:
        with pdfplumber.open(pdf_path) as pdf:
            num_pages = len(pdf.pages)
            for page in pdf.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
    except Exception as e:
        print(f"Standard extraction warning: {e}")

    if len(text.strip()) < 50:
        print("Text too short. Switching to OCR...")
        try:
            images = convert_from_path(pdf_path)
            num_pages = len(images)
            text = ""
            for i, img in enumerate(images):
                text += pytesseract.image_to_string(img, lang='heb+eng') + "\n"
        except Exception as e:
            print(f"OCR failed: {e}")
    
    return text, num_pages

def handler(event, context):
    try:
        bucket = event['bucket']
        key = unquote_plus(event['key'])
        local_path = '/tmp/doc.pdf'
        
        s3.download_file(bucket, key, local_path)
        extracted_text, page_count = extract_text_smart(local_path)
        
        # --- בדיקת אימות: חייב להחזיר bucket ו-key ---
        return {
            'bucket': bucket,
            'key': key,
            'contractId': key,
            'extractedText': extracted_text,
            'pageCount': page_count
        }
    except Exception as e:
        print(f"Error: {str(e)}")
        raise e