# Gemini Text Extractor - Lambda Deployment Guide (AWS Console)

This guide explains how to deploy the Gemini-based PDF text extractor using **AWS Console only** (no CLI needed).

## Prerequisites

- AWS account with Lambda access
- Google Cloud account with Gemini API access
- Your Gemini API key: `GEMINI_KEY`

---

## Step 1: Create the Lambda Layer (for dependencies)

The Lambda needs the `google-genai` library. You need to create a layer with this library.

### On Your Local Computer:

1. Open **PowerShell** or **Command Prompt**
2. Run these commands:
   ```bash
   mkdir python
   pip install google-genai -t python/
   ```
3. Zip the `python` folder → name it `gemini-layer.zip`

### In AWS Console:

1. Go to **AWS Lambda** → **Layers** (left sidebar)
2. Click **Create layer**
3. Fill in:
   - **Name**: `gemini-genai`
   - **Description**: `Google GenAI SDK for Gemini API`
   - **Upload**: Select your `gemini-layer.zip` file
   - **Compatible runtimes**: Select `Python 3.11` and `Python 3.12`
4. Click **Create**
5. **Copy the Layer ARN** - you'll need it later!

---

## Step 2: Create the Lambda Function

1. Go to **AWS Lambda** → **Functions**
2. Click **Create function**
3. Select **Author from scratch**
4. Fill in:
   - **Function name**: `gemini-text-extractor`
   - **Runtime**: `Python 3.11`
   - **Architecture**: `x86_64`
5. Under **Permissions**:
   - Select **Use an existing role**
   - Choose your existing Lambda role (same one used by `TextExtraction-OCR`)
6. Click **Create function**

---

## Step 3: Upload the Code

1. In your new Lambda function, scroll to **Code source**
2. Delete the default code in `lambda_function.py`
3. **Copy ALL the code** from `gemini-text-extractor.py` and paste it
4. **IMPORTANT**: Rename the file from `lambda_function.py` to `gemini-text-extractor.py`
   - Right-click on the file tab → **Rename**
5. Click **Deploy** (orange button)

---

## Step 4: Add the Layer

1. Scroll down to **Layers** section
2. Click **Add a layer**
3. Select **Custom layers**
4. Choose **gemini-genai** from the dropdown
5. Select **Version 1**
6. Click **Add**

---

## Step 5: Set Environment Variables

**THIS IS THE MOST IMPORTANT STEP!**

1. Go to **Configuration** tab → **Environment variables**
2. Click **Edit**
3. Click **Add environment variable**
4. Add:
   - **Key**: `GEMINI_API_KEY`
   - **Value**: `GEMINI_KEY`
5. Click **Save**

---

## Step 6: Configure General Settings

1. Go to **Configuration** tab → **General configuration**
2. Click **Edit**
3. Set:
   - **Memory**: `512 MB`
   - **Timeout**: `2 min 0 sec` (120 seconds)
4. Click **Save**

---

## Step 7: Add S3 Permissions (if needed)

If your Lambda role doesn't already have S3 access:

1. Go to **Configuration** tab → **Permissions**
2. Click on the **Role name** link (opens IAM)
3. Click **Add permissions** → **Attach policies**
4. Search for `AmazonS3ReadOnlyAccess`
5. Select it and click **Add permissions**

**Or create a custom inline policy:**
1. Click **Add permissions** → **Create inline policy**
2. Switch to **JSON** tab
3. Paste:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": ["s3:GetObject"],
         "Resource": "arn:aws:s3:::rentguard-contracts-moty-101225/*"
       }
     ]
   }
   ```
4. Click **Next** → Name it `S3ReadContracts` → **Create policy**

---

## Step 8: Test the Lambda

1. Go to the **Test** tab
2. Click **Create new event**
3. Name it: `TestPDFExtraction`
4. Paste this JSON:
   ```json
   {
     "bucket": "rentguard-contracts-moty-101225",
     "key": "uploads/YOUR_USER_ID/YOUR_CONTRACT.pdf"
   }
   ```
   (Replace with a real PDF path from your S3 bucket)
5. Click **Save** → **Test**
6. Check the **Execution results** - you should see the extracted text!

---

## Step 9: Update Step Functions (OPTIONAL - After Testing!)

**Only do this after successful testing!**

1. Go to **Step Functions** → Your state machine
2. Click **Edit**
3. Find the `ExtractPDFText` step
4. Change the Resource from:
   ```
   arn:aws:lambda:us-east-1:459347924875:function:TextExtraction-OCR:$LATEST
   ```
   To:
   ```
   arn:aws:lambda:us-east-1:459347924875:function:gemini-text-extractor
   ```
5. Click **Save**

**TIP**: Keep the old `TextExtraction-OCR` Lambda - don't delete it! You can switch back if needed.

---

## Troubleshooting

| Error | Solution |
|-------|----------|
| `ModuleNotFoundError: google` | Layer not attached - check Step 4 |
| `GEMINI_API_KEY environment variable not set` | Check Step 5 - env var missing |
| `Task timed out` | Increase timeout in Step 6 |
| `AccessDenied` on S3 | Add permissions in Step 7 |
| `handler 'handler' not found` | Make sure file is named `gemini-text-extractor.py` and function is `handler` |

---

## Summary Checklist

- [ ] Created layer with `google-genai`
- [ ] Created Lambda function `gemini-text-extractor`
- [ ] Uploaded code from `gemini-text-extractor.py`
- [ ] Added the layer to the function
- [ ] Set environment variable `GEMINI_API_KEY`
- [ ] Set timeout to 120 seconds
- [ ] Set memory to 512 MB
- [ ] Added S3 read permissions
- [ ] Tested with a real PDF
- [ ] (Optional) Updated Step Functions

---

## Cost

| Item | Cost |
|------|------|
| Gemini API | Free tier: 2M tokens/month |
| Lambda | Free tier: 400,000 GB-seconds/month |
| **Total** | **FREE for testing!** |
