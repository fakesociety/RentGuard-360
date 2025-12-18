"""
Gemini Text Extractor - REST API Version (NO EXTERNAL DEPENDENCIES)
Uses only built-in Python libraries: urllib, json, base64

This version calls the Gemini REST API directly, so you don't need
any Lambda Layers or external packages!
"""

import json
import boto3
import base64
import os
import urllib.request
import urllib.error

# Initialize S3 client
s3 = boto3.client('s3')

# Get API key from environment variable
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')

# Gemini API endpoint - gemini-2.0-flash-001 is the current stable model
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent"


def handler(event, context):
    """
    Lambda handler for Gemini-based PDF text extraction.
    Uses REST API - no external libraries needed!
    
    Input event:
    {
        "bucket": "rentguard-contracts-xxx",
        "key": "uploads/userId/contract-uuid.pdf"
    }
    """
    try:
        bucket = event.get('bucket')
        key = event.get('key')
        
        if not bucket or not key:
            raise ValueError("Missing bucket or key in event")
        
        print(f"Processing PDF: s3://{bucket}/{key}")
        
        # 1. Download PDF from S3
        local_path = '/tmp/contract.pdf'
        s3.download_file(bucket, key, local_path)
        print(f"Downloaded PDF to {local_path}")
        
        # 2. Read PDF as base64
        with open(local_path, 'rb') as f:
            pdf_bytes = f.read()
            base64_pdf = base64.standard_b64encode(pdf_bytes).decode('utf-8')
        
        print(f"PDF size: {len(pdf_bytes)} bytes")
        
        # 3. Check API key
        if not GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY environment variable not set")
        
        # 4. Build the API request
        prompt_text = """Extract ALL text from this Hebrew rental contract PDF.

INSTRUCTIONS:
1. Preserve the exact text as written in the document
2. Maintain the original structure and paragraph breaks
3. Include all Hebrew and English text
4. Do NOT summarize or modify the text
5. Do NOT add any explanations or commentary
6. IGNORE and DO NOT include:
   - Scanner app logos/watermarks (CamScanner, Adobe Scan, Microsoft Lens, Genius Scan, etc.)
   - App download prompts or URLs
   - Page numbers added by scanning apps
   - Any text that is clearly NOT part of the original contract document
   - Watermarks or stamps from scanning software
7. Just return the raw contract text only

Return ONLY the extracted contract text, nothing else."""

        request_body = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt_text},
                        {
                            "inline_data": {
                                "mime_type": "application/pdf",
                                "data": base64_pdf
                            }
                        }
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.0,
                "maxOutputTokens": 8000
            }
        }
        
        # 5. Make API request
        url = f"{GEMINI_API_URL}?key={GEMINI_API_KEY}"
        headers = {"Content-Type": "application/json"}
        
        req = urllib.request.Request(
            url,
            data=json.dumps(request_body).encode('utf-8'),
            headers=headers,
            method='POST'
        )
        
        print("Calling Gemini API...")
        
        with urllib.request.urlopen(req, timeout=90) as response:
            result = json.loads(response.read().decode('utf-8'))
        
        # 6. Extract text from response
        extracted_text = ""
        if 'candidates' in result and len(result['candidates']) > 0:
            candidate = result['candidates'][0]
            if 'content' in candidate and 'parts' in candidate['content']:
                for part in candidate['content']['parts']:
                    if 'text' in part:
                        extracted_text += part['text']
        
        if not extracted_text:
            raise ValueError("Gemini returned empty response")
        
        # 7. Estimate page count
        estimated_pages = max(1, min(15, len(extracted_text) // 2500))
        
        print(f"Extracted {len(extracted_text)} characters (~{estimated_pages} pages)")
        
        # 8. Return in format expected by privacy-shield
        return {
            'bucket': bucket,
            'key': key,
            'contractId': key,
            'extractedText': extracted_text,
            'pageCount': estimated_pages,
            'extractionMethod': 'gemini-2.0-flash-rest'
        }
        
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8') if e.fp else str(e)
        print(f"Gemini API error: {e.code} - {error_body}")
        raise Exception(f"Gemini API error: {e.code}")
        
    except Exception as e:
        print(f"Error in Gemini text extraction: {str(e)}")
        raise e
