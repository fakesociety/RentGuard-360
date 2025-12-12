event pattern

{
  "source": ["aws.s3"],
  "detail-type": ["Object Created"],
  "detail": {
    "bucket": {
      "name": ["rentguard-contracts-moty-101225"]
    },
    "object": {
      "key": [{
        "prefix": "uploads/"
      }]
    }
  }
}

Input path
{
  "bucket": "$.detail.bucket.name",
  "key": "$.detail.object.key"
}
Input template 
{
  "bucket": <bucket>,
  "key": <key>
}

DynamoDB Tables: RentGuard-Contracts, RentGuard-Analysis

Cognito User Pool ID: ...

identity pool id:us-east-1:6e95f8a5-a583-45f6-8bf6-5c818261af21 

שכבות (Layers): ציין ש-pdf-processor משתמש ב-PyPDF2 Layer.
