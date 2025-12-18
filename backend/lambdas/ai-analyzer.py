import json
import boto3
import traceback
import re

# Initialize Bedrock client
bedrock = boto3.client(service_name='bedrock-runtime', region_name='us-east-1')

# Israeli Rental Law Knowledge Base (Fair Rental Law 2017 / חוק שכירות הוגנת)
KNOWLEDGE_BASE = """
ISRAELI RENTAL LAW - KEY RULES (Fair Rental Law 2017 / חוק שכירות הוגנת)

FINANCIAL RULES:
- F1: Maximum security deposit is 3 months rent OR 1/3 of total lease (whichever is lower) [Section 25]
- F2: Deposit must be returned within 60 days after lease ends
- F3: Rent cannot increase during lease without explicit clause
- F4: Late penalties should be reasonable (max ~2% per week)

TENANT RIGHTS:
- T1: Landlord must give 24-48h notice before entering property
- T2: Complete subletting prohibition without exception may be unfair
- T3: Landlord cannot cut off utilities (electricity, water, gas) [Illegal]
- T4: Tenant can make minor modifications (hanging pictures, etc.)

TERMINATION RULES:
- E1: Tenant early termination notice: typically 60 days
- E2: Landlord must give 90 days notice for early termination
- E3: Early termination conditions must be clear and mutual
- E4: Tenant shouldn't pay full remaining rent if finding replacement

LIABILITY RULES:
- L1: Landlord responsible for structural/essential repairs [Section 6]
- L2: Normal wear and tear is NOT tenant's responsibility
- L3: Insurance requirements must be reasonable
- L4: Damage claims must be proportional and documented

LEGAL COMPLIANCE:
- C1: Contract must comply with Fair Rental Law 2017
- C2: Property must meet habitability standards [Section 3]
- C3: Contract cannot waive statutory tenant protections [Section 30]
- C4: Both parties must receive signed contract copies
"""

SCORING_RUBRIC = """
SCORING METHOD:
- Start at 100 points (perfect contract)
- Deduct points for each violated rule
- Each violation: cite rule ID (F1, T1, etc.), quote text, explain penalty

PENALTY GUIDELINES:
- Severe violation (illegal/major harm): -7 to -10 points
- Moderate violation (unfair but legal): -4 to -6 points  
- Minor concern (unusual but negotiable): -2 to -3 points

SCORE INTERPRETATION:
- 0-30: HIGH RISK - Major legal concerns
- 31-50: MEDIUM-HIGH RISK - Several concerning clauses
- 51-70: MEDIUM RISK - Some issues to negotiate
- 71-85: LOW-MEDIUM RISK - Minor issues, generally acceptable
- 86-100: LOW RISK - Fair and balanced contract
"""

# =============================================================================
# MODEL CONFIGURATION - Validated for AWS Bedrock
# =============================================================================
# IMPORTANT NOTES:
# 1. Haiku 4.5 requires regional prefix "us." for us-east-1
# 2. Does NOT support both temperature AND topP - use only temperature
# 3. maxTokens can be up to 8192
# =============================================================================

MODEL_ID = "us.anthropic.claude-haiku-4-5-20251001-v1:0"

# Inference config - ONLY temperature, no topP (not allowed for Haiku 4.5)
INFERENCE_CONFIG = {
    "maxTokens": 8192,
    "temperature": 0.0  # Deterministic output for consistent analysis
}


def call_bedrock(model_id, system_prompt, user_message):
    """
    Call Bedrock with the specified model.
    Returns the response text or raises an exception.
    """
    response = bedrock.converse(
        modelId=model_id,
        system=[{"text": system_prompt}],
        messages=[user_message],
        inferenceConfig=INFERENCE_CONFIG
    )
    return response['output']['message']['content'][0]['text']


def parse_json_response(ai_output_text):
    """
    Parse JSON from AI response, handling markdown wrappers and edge cases.
    """
    # Clean markdown wrappers
    clean_text = ai_output_text.replace("```json", "").replace("```", "").strip()
    
    # Find JSON object
    match = re.search(r'\{.*\}', clean_text, re.DOTALL)
    if not match:
        raise ValueError("No JSON object found in response")
    
    analysis_json = json.loads(match.group(0))
    
    # Validate and add missing required fields
    if 'is_contract' not in analysis_json:
        analysis_json['is_contract'] = True
    
    if 'overall_risk_score' not in analysis_json:
        analysis_json['overall_risk_score'] = 50  # Default middle score
    
    if 'score_breakdown' not in analysis_json:
        analysis_json['score_breakdown'] = {
            "financial_terms": {"score": 20, "deductions": []},
            "tenant_rights": {"score": 20, "deductions": []},
            "termination_clauses": {"score": 20, "deductions": []},
            "liability_repairs": {"score": 20, "deductions": []},
            "legal_compliance": {"score": 20, "deductions": []}
        }
    
    if 'issues' not in analysis_json:
        analysis_json['issues'] = []
    
    if 'summary' not in analysis_json:
        analysis_json['summary'] = "הניתוח הושלם."
    
    return analysis_json


def create_fallback_response(error_message, raw_response=""):
    """
    Create a fallback response when parsing fails.
    """
    return {
        "is_contract": True,
        "overall_risk_score": 0,
        "score_breakdown": {
            "financial_terms": {"score": 20, "deductions": []},
            "tenant_rights": {"score": 20, "deductions": []},
            "termination_clauses": {"score": 20, "deductions": []},
            "liability_repairs": {"score": 20, "deductions": []},
            "legal_compliance": {"score": 20, "deductions": []}
        },
        "summary": "הניתוח הושלם אך יש שגיאת פורמט טכנית.",
        "issues": [],
        "parse_error": error_message,
        "raw_ai_response": raw_response[:1000] if raw_response else ""
    }


def lambda_handler(event, context):
    """
    Main Lambda handler for AI contract analysis.
    """
    try:
        # 1. Extract input data
        sanitized_text = event.get('sanitizedText') or event.get('extractedText', '')
        contract_id = event.get('contractId', 'unknown')
        bucket = event.get('bucket')
        key = event.get('key')
        clauses_list = event.get('clauses', [])
        
        # 2. Validate input - just check empty
        if not sanitized_text:
            return {
                'contractId': contract_id, 
                'analysis_result': {
                    'error': 'No contract text found',
                    'is_contract': False,
                    'overall_risk_score': 0,
                    'issues': []
                },
                'bucket': bucket,
                'key': key,
                'clauses': clauses_list,
                'sanitizedText': ''
            }

        # 3. Budget protection: limit text length (saves tokens = saves money)
        MAX_TEXT_LENGTH = 25000
        if len(sanitized_text) > MAX_TEXT_LENGTH:
            print(f"Truncating text from {len(sanitized_text)} to {MAX_TEXT_LENGTH} chars")
            sanitized_text = sanitized_text[:MAX_TEXT_LENGTH] + "... [Text Truncated]"

        # 4. Build system prompt
        system_prompt = f"""You are an expert Israeli real estate lawyer analyzing rental contracts.

{KNOWLEDGE_BASE}

{SCORING_RUBRIC}

TASK: Analyze the contract and return ONLY valid JSON with this EXACT structure:

{{
  "is_contract": true,
  "overall_risk_score": <number 0-100>,
  "score_breakdown": {{
    "financial_terms": {{"score": <0-20>, "deductions": []}},
    "tenant_rights": {{"score": <0-20>, "deductions": []}},
    "termination_clauses": {{"score": <0-20>, "deductions": []}},
    "liability_repairs": {{"score": <0-20>, "deductions": []}},
    "legal_compliance": {{"score": <0-20>, "deductions": []}}
  }},
  "summary": "<Hebrew summary of 2-3 sentences>",
  "issues": [
    {{
      "rule_id": "<F1/T1/E1/L1/C1 etc>",
      "clause_topic": "<Hebrew topic>",
      "original_text": "<exact quote from contract>",
      "risk_level": "High/Medium/Low",
      "penalty_points": <number>,
      "legal_basis": "<which law/rule this violates>",
      "explanation": "<Hebrew explanation why this is risky>",
      "suggested_fix": "<THE ACTUAL CORRECTED CLAUSE TEXT IN HEBREW - write the new clause directly, NOT instructions like 'יש לשנות ל' or 'יש להסיר'>"
    }}
  ]
}}

RULES FOR ANALYSIS:
1. ONLY cite rules from the knowledge base above
2. If something is not covered, mark as "Standard Practice" 
3. Each issue MUST include rule_id and legal_basis
4. Score = 100 - sum of all penalty_points
5. If document is NOT a rental contract, return is_contract: false with score 0
6. For suggested_fix: Write the CORRECTED text directly. Do NOT write "יש לשנות ל" or "יש להסיר" - just write the actual replacement clause text.

IMPORTANT: Return ONLY the JSON, no markdown, no explanation outside JSON."""

        user_message = {
            "role": "user",
            "content": [{"text": f"Analyze this rental contract:\n\n{sanitized_text}"}]
        }

        # 5. Call Bedrock
        print(f"Calling model: {MODEL_ID}")
        ai_output_text = call_bedrock(MODEL_ID, system_prompt, user_message)
        print("Model call succeeded")

        # 6. Parse JSON response
        try:
            analysis_json = parse_json_response(ai_output_text)
        except Exception as parse_error:
            print(f"JSON Parse Error: {str(parse_error)}")
            print(f"Raw response: {ai_output_text[:500] if ai_output_text else 'None'}")
            analysis_json = create_fallback_response(str(parse_error), ai_output_text)

        # 7. Return success response
        return {
            'contractId': contract_id,
            'analysis_result': analysis_json,
            'bucket': bucket,
            'key': key,
            'clauses': clauses_list,
            'sanitizedText': sanitized_text
        }
        
    except Exception as e:
        traceback.print_exc()
        print(f"Lambda handler error: {str(e)}")
        raise e