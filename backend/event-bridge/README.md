# EventBridge Configuration

This rule triggers the Step Functions workflow when a PDF is uploaded to S3.

## Event Pattern
```json
{
  "source": ["aws.s3"],
  "detail-type": ["Object Created"],
  "detail": {
    "bucket": {
      "name": ["<contracts-bucket-name>"]
    },
    "object": {
      "key": [{
        "prefix": "uploads/"
      }]
    }
  }
}
```

## Input Transformer

**Input Path:**
```json
{
  "bucket": "$.detail.bucket.name",
  "key": "$.detail.object.key"
}
```

**Input Template:**
```json
{
  "bucket": <bucket>,
  "key": <key>
}
```

## Triggered Workflow

1. **RentGuard_AzureOCR** - Extract text from PDF using Azure Document Intelligence
2. **privacy-shield** - Remove PII (phone numbers, IDs, etc.)
3. **ai-analyzer** - Analyze contract using Claude AI (Bedrock)
4. **save-results** - Save analysis to DynamoDB
5. **NotifyUser** - Send email notification via SES

## Related Resources

- DynamoDB Tables: `<ProjectName>-Contracts`, `<ProjectName>-Analysis`
- Cognito User Pool: `<ProjectName>-UserPool`
