import json
import boto3
import traceback
import re

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

def lambda_handler(event, context):
    try:
        # 1. Extract input data
        sanitized_text = event.get('sanitizedText') or event.get('extractedText', '')
        contract_id = event.get('contractId', 'unknown')
        bucket = event.get('bucket')
        key = event.get('key')
        clauses_list = event.get('clauses', [])
        
        if not sanitized_text:
            return {
                'contractId': contract_id, 
                'analysis_result': {'error': 'No text found', 'is_contract': False},
                'bucket': bucket,
                'key': key,
                'clauses': clauses_list,
                'sanitizedText': ''
            }

        # Budget protection: limit text length
        if len(sanitized_text) > 25000:
            sanitized_text = sanitized_text[:25000] + "... [Text Truncated]"

        # === MODEL SELECTION ===
        # Claude Haiku 4.5 - Best Hebrew support, serverless
        model_id = "anthropic.claude-haiku-4-5-20251001-v1:0"

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
      "suggested_fix": "<Hebrew suggestion for better wording>"
    }}
  ]
}}

RULES FOR ANALYSIS:
1. ONLY cite rules from the knowledge base above
2. If something is not covered, mark as "Standard Practice" 
3. Each issue MUST include rule_id and legal_basis
4. Score = 100 - sum of all penalty_points
5. If document is NOT a rental contract, return is_contract: false with score 0

IMPORTANT: Return ONLY the JSON, no markdown, no explanation outside JSON."""

        user_message = {
            "role": "user",
            "content": [{"text": f"Analyze this rental contract:\n\n{sanitized_text}"}]
        }

        response = bedrock.converse(
            modelId=model_id,
            system=[{"text": system_prompt}],
            messages=[user_message],
            inferenceConfig={"maxTokens": 8192, "temperature": 0.0, "topP": 1.0}
        )

        ai_output_text = response['output']['message']['content'][0]['text']
        
        # Clean markdown wrappers if present
        ai_output_text = ai_output_text.replace("```json", "").replace("```", "").strip()
        
        # Extract JSON using regex
        try:
            match = re.search(r'\{.*\}', ai_output_text, re.DOTALL)
            if match:
                clean_json = match.group(0)
                analysis_json = json.loads(clean_json)
                
                # Validate and ensure required fields exist
                if 'score_breakdown' not in analysis_json:
                    analysis_json['score_breakdown'] = {
                        "financial_terms": {"score": 20, "deductions": []},
                        "tenant_rights": {"score": 20, "deductions": []},
                        "termination_clauses": {"score": 20, "deductions": []},
                        "liability_repairs": {"score": 20, "deductions": []},
                        "legal_compliance": {"score": 20, "deductions": []}
                    }
            else:
                raise Exception("No JSON found in response")
                
        except Exception as e:
            print(f"JSON Parse Error: {str(e)}")
            print(f"Raw response: {ai_output_text[:500]}")
            analysis_json = {
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
                "raw_ai_response": ai_output_text[:1000]
            }

        # Return with all passthrough data
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
        raise e