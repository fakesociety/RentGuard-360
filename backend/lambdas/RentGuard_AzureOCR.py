import json
import boto3
import time
import os
import urllib3
import uuid

s3 = boto3.client('s3')
http = urllib3.PoolManager()

MAX_PAGES_TOTAL = 20  # Can increase to 500 depending on quota
PAGES_PER_REQUEST = 2

def lambda_handler(event, context):
    """
    RentGuard Azure OCR - PDF Text Extraction using Azure Document Intelligence
    
    Uses Azure's free tier with optimal batching (2 pages per request).
    Supports Hebrew text extraction with high accuracy.
    
    Input event:
    {
        "bucket": "rentguard-contracts-xxx",
        "key": "uploads/userId/contract-uuid.pdf"
    }
    
    Environment variables required:
    - AZURE_DOC_KEY: Azure Document Intelligence API key
    - AZURE_DOC_ENDPOINT: Azure endpoint URL
    """
    print("Starting Azure Document Intelligence OCR (Free Tier, optimal batching)...")
    
    bucket_name = event.get('bucket')
    file_key = event.get('key')
    contract_id = event.get('contractId') or str(uuid.uuid4())
    
    if not bucket_name or not file_key:
        return {'error': 'Missing bucket or key'}

    azure_key = os.environ.get('AZURE_DOC_KEY')
    azure_endpoint = os.environ.get('AZURE_DOC_ENDPOINT')
    
    if not azure_key or not azure_endpoint:
        raise Exception("Missing Azure configuration")

    try:
        # Download from S3
        print(f"Downloading file: {file_key}")
        s3_response = s3.get_object(Bucket=bucket_name, Key=file_key)
        file_bytes = s3_response['Body'].read()
        
        if file_key.lower().endswith('.pdf'):
            content_type = 'application/pdf'
        elif file_key.lower().endswith('.png'):
            content_type = 'image/png'
        else:
            content_type = 'image/jpeg'

        base_url = azure_endpoint.rstrip('/')
        all_text = ""
        total_pages = 0
        
        # Process in batches of 2 pages at a time
        for start_page in range(1, MAX_PAGES_TOTAL + 1, PAGES_PER_REQUEST):
            end_page = start_page + PAGES_PER_REQUEST - 1
            analyze_url = (
                f"{base_url}/formrecognizer/documentModels/prebuilt-read:analyze"
                f"?api-version=2023-07-31&pages={start_page}-{end_page}"
            )
            headers = {
                'Ocp-Apim-Subscription-Key': azure_key,
                'Content-Type': content_type
            }
            print(f"Requesting pages {start_page}-{end_page}...")
            response = http.request('POST', analyze_url, body=file_bytes, headers=headers)

            if response.status != 202:
                print(f"Error at pages {start_page}-{end_page}, stopping")
                break

            # Polling for results
            operation_url = response.headers['Operation-Location']
            status = 'running'
            retries = 0
            while status in ['running', 'notStarted']:
                if retries > 30:
                    print("Timeout waiting for Azure OCR")
                    break
                time.sleep(2)
                poll_response = http.request('GET', operation_url, headers={'Ocp-Apim-Subscription-Key': azure_key})
                poll_data = json.loads(poll_response.data.decode('utf-8'))
                status = poll_data.get('status', 'failed')
                retries += 1

            if status == 'succeeded':
                analyze_result = poll_data.get('analyzeResult', {})
                pages = analyze_result.get('pages', [])
                pages_returned = len(pages)
                if pages_returned == 0:
                    print(f"No more pages, total: {total_pages}")
                    break
                page_text = analyze_result.get('content', '')
                all_text += page_text + "\n"
                total_pages += pages_returned
                print(f"Got {pages_returned} pages (total: {total_pages})")
                # If we got less than 2 pages, we've reached the end
                if pages_returned < PAGES_PER_REQUEST:
                    print("Last batch reached")
                    break
            else:
                print(f"Failed at pages {start_page}-{end_page}")
                break

        print(f"SUCCESS! {len(all_text)} chars from {total_pages} pages")
        return {
            'statusCode': 200,
            'extractedText': all_text,
            'pagesCount': total_pages,
            'bucket': bucket_name,
            'key': file_key,
            'contractId': contract_id
        }

    except Exception as e:
        print(f"ERROR: {str(e)}")
        raise e
