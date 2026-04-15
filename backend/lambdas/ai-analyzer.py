"""
=============================================================================
LAMBDA: ai-analyzer
AI-powered contract analysis using Claude (Bedrock)
=============================================================================

Trigger: Step Functions (after privacy-shield)
Input: Sanitized contract text, clauses list, S3 metadata
Output: Analysis result with risk score, issues, and recommendations

External Services:
  - AWS Bedrock: Claude Haiku 4.5 for legal analysis

Processing Steps:
  1. Validate input text and detect language
  2. Build detailed prompt with Israeli rental law knowledge base
  3. Call Claude for contract analysis
  4. Parse JSON response from AI
  5. Recalculate scores using Python (override AI calculations)

Notes:
  - Specialized for Israeli rental contracts (Hebrew)
  - Contains comprehensive knowledge base of Israeli rental law
  - Uses severity guide to ensure consistent risk ratings
  - Scores are calculated by Python, not trusted from AI

=============================================================================
"""

# =============================================================================
# IMPORTS
# =============================================================================

import json
import boto3
from botocore.config import Config
import traceback
import re

# =============================================================================
# CONFIGURATION
# =============================================================================

# Bedrock client with extended timeout for large contracts
bedrock_config = Config(
    read_timeout=300,  # 5 minutes
    connect_timeout=30,
    retries={'max_attempts': 3}
)
bedrock = boto3.client(
    service_name='bedrock-runtime',
    region_name='us-east-1',
    config=bedrock_config
)

# Model settings
MODEL_ID = "us.anthropic.claude-haiku-4-5-20251001-v1:0"
INFERENCE_CONFIG = {"maxTokens": 8192, "temperature": 0.0}

# Maximum text length to process
MAX_TEXT_LENGTH = 25000

# =============================================================================
# KNOWLEDGE BASE
# Israeli Rental Law Reference (Hebrew)
# Based on: Rental Law Amendment 2017, sections 25a-25o
# =============================================================================

KNOWLEDGE_BASE = """
חוק השכירות והשאילה - מקורות:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. ראשוני: תיקון 2017 - סעיפים 25א-25טו (חוזה שכירות למגורים)
2. משני: חוק 1971 - סעיפים 1-25 (הוראות כלליות)
3. ⛔ אסור: חוק הגנת הדייר 1972 - לא רלוונטי!

═══════════════════════════════════════════════════════════════════

חוקי כספים (F):
- F1: [25י(ב)] ערובה מקסימלית = הנמוך מבין: 3 חודשים או שליש מתקופת השכירות
- F2: [25י(ה)] החזרת ערובה תוך 60 יום מסיום השכירות
- F3: [25ט(א)] דמי שכירות חייבים להיות מפורטים
- F4: [נהוג] קנסות איחור: עד 2% לשבוע = תקין. מעל 3-4% לשבוע = מופרז
- F5: [25ט(ב)(3)] שוכר לא משלם דמי תיווך של המשכיר
- F6: [25י(ג)] ערובה רק עבור: שכ"ד, תיקונים, חובות, אי-פינוי
- F7: [25י(ד)] הודעה לשוכר לפני מימוש ערובה

זכויות שוכר (T):
- T1: [סעיף 17] הודעה 24-48 שעות לפני כניסה לדירה
- T2: [סעיף 22] איסור גורף על סאבלט ללא נימוק
- T3: [אסור] ניתוק חשמל/מים לסילוק שוכר
- T4: [סעיף 16א] שינויים רק בהסכמת המשכיר
- T5: [25ה + סעיף 6] זכויות במקרה אי-התאמה
- T6: [25ט(ב)] שוכר לא משלם: ביטוח מבנה, תיווך, השבחות
- T7: [25ז(ג)] הוראות תחזוקה מהמשכיר

סיום שכירות (E):
- E1: [25יב(ג)] הודעת שוכר 60 יום
- E2: [25יב(ב)] הודעת משכיר 90 יום
- E3: [25יג] משכיר לא יכול לבטל בלי עילה
- E4: [נוהג] מציאת דייר חלופי
- E5: [25יב(א)] הודעה על כוונות הארכה

אחריות ותיקונים (L):
- L1: [25ח(ב)] משכיר אחראי לתיקונים
- L2: [25ח(ב)] תיקון רגיל: 30 יום
- L3: [25ח(ב)] תיקון דחוף: 3 ימים
- L4: [נוהג] בלאי סביר לא על השוכר
- L5: [25ט(ב)(2)] ביטוח מבנה - משכיר
- L6: [סעיף 9] תיקון עצמי וקיזוז

תאימות חוקית (C):
- C1: [25יד] איסור התניה
- C2: [25ו + תוספת ראשונה] דירה ראויה למגורים
- C3: [25ב] חוזה בכתב
- C4: [25ג + תוספת שנייה] תוכן חוזה
- C5: [25ו(ב)] מסירת דירה לא ראויה = הפרה
- C6: [25טו] סייגי תחולה
- C7: [סעיף 6] התאמת המושכר
- C99: [כללי] הפרה כללית

═══════════════════════════════════════════════════════════════════
"""

# =============================================================================
# SEVERITY GUIDE
# Criteria for risk level ratings (Hebrew)
# =============================================================================

SEVERITY_GUIDE = """
╔═══════════════════════════════════════════════════════════════════╗
║           קריטריונים לדירוג חומרה - חובה לעקוב!                   ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  HIGH (penalty: 8-10) - הפרה חמורה:                               ║
║  ├─ סעיף שנאסר במפורש בחוק (סעיף 25יד)                            ║
║  ├─ סעיף שמטיל על השוכר תשלום אסור                                ║
║  ├─ ערובה מעל המותר בחוק                                          ║
║  ├─ ביטול חד צדדי של המשכיר ללא עילה                              ║
║  ├─ ויתור על זכות שלא ניתן לוותר עליה                             ║
║  └─ דירה לא ראויה למגורים                                         ║
║                                                                   ║
║  MEDIUM (penalty: 4-6) - לא הוגן:                                 ║
║  ├─ זמני הודעה קצרים מהנדרש                                       ║
║  ├─ הגבלה מוגזמת על סאבלט                                         ║
║  ├─ קנסות גבוהים אך לא אסורים                                     ║
║  ├─ העברת אחריויות שבדרך כלל על המשכיר                            ║
║  └─ סעיפים מעורפלים שמטים לטובת המשכיר                            ║
║                                                                   ║
║  LOW (penalty: 2-3) - חריג:                                       ║
║  ├─ ניסוח לא מדויק שאינו משנה מהות                                ║
║  ├─ פרטים חסרים לא קריטיים                                        ║
║  ├─ תנאים חריגים אך לא אסורים                                     ║
║  └─ סעיפים שניתן לנהל עליהם מו"מ                                  ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝

סעיפים לא סטנדרטיים / יצירתיים:
- אם סעיף מנסה לעקוף את החוק בדרך יצירתית → HIGH
- אם סעיף חריג אך לא אסור → בדוק אם פוגע בשוכר → MEDIUM/LOW
- אם סעיף לא ברור → ציין שהניסוח מעורפל → MEDIUM
- אם סעיף לא מופיע ברשימת הכללים → השתמש ב-C99
"""

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def call_bedrock(model_id, system_prompt, user_message):
    """
    Call Bedrock Claude API and return response text.
    
    Args:
        model_id: Bedrock model identifier
        system_prompt: System instructions for Claude
        user_message: User message with contract text
    
    Returns:
        str: AI response text
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
    Parse JSON from AI response, handling common issues.
    
    Args:
        ai_output_text: Raw text response from Claude
    
    Returns:
        dict: Parsed analysis result
    
    Raises:
        ValueError: If no valid JSON found
    """
    clean_text = ai_output_text.replace("```json", "").replace("```", "").strip()
    match = re.search(r'\{.*\}', clean_text, re.DOTALL)
    if not match:
        raise ValueError("No JSON found")
    
    json_str = match.group(0)
    
    # Remove invalid control characters (can appear from raw contract text)
    json_str = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', json_str)
    
    # Fix common JSON escape issues in Hebrew text
    json_str = json_str.replace('\r\n', '\\n').replace('\r', '\\n')
    
    data = json.loads(json_str)
    data.setdefault('is_contract', True)
    data.setdefault('issues', [])
    data.setdefault('summary', "הניתוח הושלם.")
    return data


def create_fallback_response(error_message):
    """
    Create fallback response when parsing fails.
    
    Args:
        error_message: Description of the parse error
    
    Returns:
        dict: Default analysis structure with error info
    """
    return {
        "is_contract": True,
        "overall_risk_score": 50,
        "score_breakdown": {
            "financial_terms": {"score": 10},
            "tenant_rights": {"score": 10},
            "termination_clauses": {"score": 10},
            "liability_repairs": {"score": 10},
            "legal_compliance": {"score": 10}
        },
        "summary": "הניתוח הושלם אך יש שגיאת פורמט.",
        "issues": [],
        "parse_error": error_message
    }


def detect_language(text):
    """
    Detect if text is in a supported language (Hebrew/English).
    
    Args:
        text: Contract text to analyze
    
    Returns:
        str: 'supported', 'unsupported', or 'unknown'
    """
    if not text or len(text) < 100:
        return 'unknown'
    
    sample = text[:2000]
    hebrew_count = sum(1 for c in sample if '\u0590' <= c <= '\u05FF')
    english_count = sum(1 for c in sample if 'a' <= c.lower() <= 'z')
    other_count = sum(1 for c in sample if ord(c) > 127 and not ('\u0590' <= c <= '\u05FF'))
    
    total_letters = hebrew_count + english_count + other_count
    if total_letters == 0:
        return 'unknown'
    
    # If more than 30% is non-Hebrew/English, it's probably unsupported
    if other_count / total_letters > 0.3:
        return 'unsupported'
    
    return 'supported'


def recalculate_scores(analysis_json):
    """
    Recalculate all scores in Python (don't trust AI calculations).
    
    Algorithm:
    1. Each category starts at 20 points
    2. Each issue's penalty deducts from its category (by rule prefix)
    3. Categories don't go below 0
    4. Overall score = sum of 5 categories (max 100)
    
    Synchronization:
    - Sum of F-rule penalties = 20 - financial_terms.score
    - Sum of T-rule penalties = 20 - tenant_rights.score
    - etc.
    
    Args:
        analysis_json: Parsed analysis from AI
    
    Returns:
        dict: Analysis with recalculated scores
    """
    if not analysis_json.get('is_contract', True):
        analysis_json['overall_risk_score'] = 0
        analysis_json['score_breakdown'] = {
            "financial_terms": {"score": 0},
            "tenant_rights": {"score": 0},
            "termination_clauses": {"score": 0},
            "liability_repairs": {"score": 0},
            "legal_compliance": {"score": 0}
        }
        return analysis_json
    
    # Start with max scores
    category_scores = {
        'financial_terms': 20,
        'tenant_rights': 20,
        'termination_clauses': 20,
        'liability_repairs': 20,
        'legal_compliance': 20
    }
    
    # Map rule prefixes to categories
    prefix_map = {
        'F': 'financial_terms',
        'T': 'tenant_rights',
        'E': 'termination_clauses',
        'L': 'liability_repairs',
        'C': 'legal_compliance'
    }
    
    filtered_issues = []
    category_penalties_sum = {cat: 0 for cat in category_scores.keys()}
    
    for issue in analysis_json.get('issues', []):
        rule_id = issue.get('rule_id', '')
        try:
            penalty = int(issue.get('penalty_points', 0))
        except (ValueError, TypeError):
            penalty = 0
        
        # Only include valid issues
        if rule_id and len(rule_id) > 0 and penalty > 0:
            prefix = rule_id[0].upper()
            if prefix in prefix_map:
                category = prefix_map[prefix]
                # Deduct from category score (minimum 0)
                category_scores[category] = max(0, category_scores[category] - penalty)
                category_penalties_sum[category] += penalty
            filtered_issues.append(issue)
    
    # Calculate overall score
    overall_score = sum(category_scores.values())
    
    # Build synchronized score_breakdown
    score_breakdown = {}
    for cat, score in category_scores.items():
        score_breakdown[cat] = {
            "score": score,
            "penalties": category_penalties_sum[cat],
            "max": 20
        }
    
    # Update analysis_json
    analysis_json['issues'] = filtered_issues
    analysis_json['score_breakdown'] = score_breakdown
    analysis_json['overall_risk_score'] = overall_score
    
    # Debug logging
    print("=== SCORE CALCULATION ===")
    print(f"Issues count: {len(filtered_issues)}")
    for cat, data in score_breakdown.items():
        print(f"  {cat}: {data['score']}/20 (penalties: {data['penalties']})")
    print(f"Overall: {overall_score}/100")
    
    return analysis_json

# =============================================================================
# MAIN HANDLER
# =============================================================================

def lambda_handler(event, context):
    """
    Main Lambda entry point - analyzes rental contract using AI.
    
    Args:
        event: Step Functions event with sanitizedText, clauses, metadata
        context: AWS Lambda context object
    
    Returns:
        dict: Analysis result with scores, issues, and recommendations
    """
    try:
        # 1. Extract input data
        sanitized_text = event.get('sanitizedText') or event.get('extractedText', '')
        contract_id = event.get('contractId', 'unknown')
        bucket = event.get('bucket')
        key = event.get('key')
        clauses_list = event.get('clauses', [])
        
        # 2. Handle empty text
        if not sanitized_text:
            return {
                'contractId': contract_id,
                'analysis_result': {'error': 'No text', 'is_contract': False, 'overall_risk_score': 0, 'issues': []},
                'bucket': bucket, 'key': key, 'clauses': clauses_list, 'sanitizedText': ''
            }
        
        # 3. Check language support
        lang = detect_language(sanitized_text)
        if lang == 'unsupported':
            return {
                'contractId': contract_id,
                'analysis_result': {
                    'error': 'המסמך בשפה לא נתמכת',
                    'error_en': 'Document is in an unsupported language',
                    'is_contract': False,
                    'overall_risk_score': 0,
                    'issues': [],
                    'summary': 'המערכת תומכת רק בחוזים בעברית או באנגלית.'
                },
                'bucket': bucket, 'key': key, 'clauses': clauses_list, 'sanitizedText': sanitized_text
            }
        
        # 4. Truncate if too long
        if len(sanitized_text) > MAX_TEXT_LENGTH:
            sanitized_text = sanitized_text[:MAX_TEXT_LENGTH] + "... [Truncated]"

        # 5. Build system prompt with knowledge base
        system_prompt = f"""אתה עורך דין ישראלי ותיק ומנוסה בדיני שכירות.
תפקידך: לזהות **רק** סעיפים שפוגעים בשוכר באופן ממשי.

{KNOWLEDGE_BASE}

{SEVERITY_GUIDE}

החזר רק JSON:
{{
  "is_contract": true,
  "summary": "<סיכום 2-3 משפטים בעברית>",
  "issues": [
    {{
      "rule_id": "<F1-F7/T1-T7/E1-E5/L1-L6/C1-C99>",
      "clause_topic": "<נושא בעברית>",
      "original_text": "<ציטוט מדויק מהחוזה>",
      "risk_level": "High/Medium/Low",
      "penalty_points": <מספר 2-10>,
      "legal_basis": "<סעיף חוק בעברית>",
      "short_summary": "<משפט אחד קצר שמסכם את הבעיה>",
      "explanation": "<הסבר בעברית>",
      "suggested_fix": "<נוסח מתוקן - לא הוראה!>"
    }}
  ]
}}

═══════════════════════════════════════════════════════════════════
🎯 עיקרון מרכזי - לפני כל דיווח שאל את עצמך:
═══════════════════════════════════════════════════════════════════

"האם הסעיף הזה יגרום **נזק ממשי** לשוכר?"
- אם כן → דווח
- אם לא, או אם יש ספק → **אל תדווח!**

חוזה ללא סעיפים פוגעניים = ציון 90-100
אין צורך למצוא בעיות בכל חוזה!

═══════════════════════════════════════════════════════════════════
🚫 אל תדווח על (WHITELIST - דברים תקינים לחלוטין):
═══════════════════════════════════════════════════════════════════

• ערובה עד 3 חודשי שכירות (חשב: סכום ערובה / שכ"ד חודשי ≤ 3)
• קנס איחור עד 2% לשבוע - נוהג מקובל!
• קנס איחור 2.5-4% לשבוע - גבוה אך לא אסור
• ארנונה, מים, חשמל, גז, ועד בית על השוכר - מותר!
• דרישת שוכר חלופי (אם לא ניתן לסרב ללא סיבה סבירה)
• הודעה 24+ שעות לפני ביקור בדירה
• הודעת משכיר 90 יום / שוכר 60 יום - בדיוק לפי החוק!
• בלאי סביר - הגנה על השוכר!
• סעיפי קיזוז הדדיים - סטנדרטי
• ניסוח שונה אך עומד ברוח החוק
• משפטים קטועים / רעש OCR / שאריות עריכה
• סעיפים שלא מזיקים לשוכר בפועל

═══════════════════════════════════════════════════════════════════
⚠️ דווח רק על (BLACKLIST - הפרות אמיתיות):
═══════════════════════════════════════════════════════════════════

דווח **רק** אם הסעיף קיים בחוזה ופוגע בשוכר:

• ערובה מעל 3 חודשים (F1)
• קנסות מעל 4% לשבוע (F4) 
• פיצוי אי-פינוי מופרז (מעל 150% מדמי שכירות יומיים) (F4)
• ביטוח מבנה על השוכר (T6)
• דמי תיווך של המשכיר על השוכר (F5)
• ביטול חד-צדדי ללא הודעה - רק למשכיר (E3)
• מימוש ערובה ללא הודעה 14+ יום מראש (F7)
• איסור מוחלט על סאבלט ללא אפשרות ערעור (T2)
• שלילת זכות לתיקונים (L1)
• סמכות לנתק חשמל/מים (T3)
• הודעה קצרה מ-30 יום (E1/E2)

אם אין סעיפים מה-BLACKLIST → issues = []

═══════════════════════════════════════════════════════════════════
⚠️ כללים טכניים:
═══════════════════════════════════════════════════════════════════

1. penalty_points: HIGH=8-10, MEDIUM=4-6, LOW=2-3. אסור: 0, 1, מעל 10!
2. original_text: ציטוט **מדויק** מהחוזה. אם לא קיים - אל תדווח!
3. suggested_fix: כתוב את **הנוסח המתוקן המלא** - לא הוראות! (יוצא דופן: אם אין ברירה ומחיקה נדרשת → "סעיף זה בטל")
4. אסור להמציא rule_id שלא ברשימה
5. אסור להתייחס לחוק 1972 / דמי מפתח
6. המנע מהכפלת הערות על אותו סעיף: אם מצאת מספר פגמים/הפרות באותו סעיף בדיוק בחוזה, **חובה לאחד אותם לאובייקט פגם יחיד (issue אחד)**:
   א. בחר את ה-rule_id וה-risk_level החמורים ביותר
   ב. ב-explanation אגד את כל הבעיות שמצאת
   ג. ספק `suggested_fix` יחיד שמשכתב את כל הסעיף כך שיפתור במקביל את כל הבעיות שמצאת ויחליף את הסעיף המקורי בשלמותו.
7. לא חוזה שכירות → is_contract = false
8. כל השדות בעברית למעט: rule_id, risk_level, is_contract

═══════════════════════════════════════════════════════════════════
🚨 הוראה קריטית אחרונה - קרא 5 פעמים!
═══════════════════════════════════════════════════════════════════

לפני שמוסיף issue לרשימה, בצע את הבדיקות הבאות:

1. **בדיקת WHITELIST**: האם הסעיף נמצא ב-WHITELIST למעלה?
   - ערובה ≤ 3 חודשים? → אל תדווח!
   - קנס ≤ 2% לשבוע? → אל תדווח!
   - ארנונה/ועד בית על שוכר? → אל תדווח!
   - הודעה 90 יום משכיר / 60 יום שוכר? → אל תדווח!
   - אם כתבת "תקין", "סביר", "אין צורך בשינוי" → אל תדווח!

2. **בדיקת OCR**: האם הטקסט הגיוני?
   - משפט קטוע / מילים חסרות / מספרים לא הגיוניים? → התעלם!
   - "שקל מדמי השכירות עבור 100"? → זה רעש OCR, התעלם!

3. **בדיקת עקביות קריטית**:
   - אם הסעיף בגבול המותר / תקין / סביר → **לא לכלול ב-issues!**
   - ה-issues array מיועד **רק** לסעיפים שצריך לתקן.
   - סעיף תקין = לא מופיע ב-issues, נקודה.

4. **בדיקה סופית**: ספור את ה-issues שלך.
   - חוזה רגיל צריך 0-2 בעיות, לא 5-10!
   - אם יש יותר מ-3 בעיות, עבור על כולן שוב ומחק את התקינות!

Python יחשב את הציון - תן penalty_points מדויק לכל בעיה."""

        # 6. Build user message
        user_message = {
            "role": "user",
            "content": [{"text": f"נתח את חוזה השכירות הבא:\n\n<contract>\n{sanitized_text}\n</contract>"}]
        }
        
        # 7. Call Claude
        print(f"Calling {MODEL_ID}")
        ai_output = call_bedrock(MODEL_ID, system_prompt, user_message)
        print("Model call succeeded")
        
        # 8. Parse response
        try:
            analysis = parse_json_response(ai_output)
        except Exception as e:
            print(f"Parse error: {e}")
            analysis = create_fallback_response(str(e))
        
        # 9. Recalculate scores in Python (don't trust AI)
        analysis = recalculate_scores(analysis)
        
        # 10. Return result
        return {
            'contractId': contract_id,
            'analysis_result': analysis,
            'bucket': bucket,
            'key': key,
            'clauses': clauses_list,
            'sanitizedText': sanitized_text
        }
        
    except Exception as e:
        traceback.print_exc()
        raise e