import json
import boto3
from botocore.config import Config
import traceback
import re

# Initialize Bedrock client with extended timeout
bedrock_config = Config(
    read_timeout=300,  # 5 minutes for very large contracts
    connect_timeout=30,
    retries={'max_attempts': 3}
)
bedrock = boto3.client(
    service_name='bedrock-runtime',
    region_name='us-east-1',
    config=bedrock_config
)

# =============================================================================
# ISRAELI RENTAL LAW KNOWLEDGE BASE
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

# Model Configuration
MODEL_ID = "us.anthropic.claude-haiku-4-5-20251001-v1:0"
INFERENCE_CONFIG = {"maxTokens": 8192, "temperature": 0.0}


def call_bedrock(model_id, system_prompt, user_message):
    """Call Bedrock and return response text."""
    response = bedrock.converse(
        modelId=model_id,
        system=[{"text": system_prompt}],
        messages=[user_message],
        inferenceConfig=INFERENCE_CONFIG
    )
    return response['output']['message']['content'][0]['text']



def parse_json_response(ai_output_text):
    """Parse JSON from AI response."""
    clean_text = ai_output_text.replace("```json", "").replace("```", "").strip()
    match = re.search(r'\{.*\}', clean_text, re.DOTALL)
    if not match:
        raise ValueError("No JSON found")
    
    json_str = match.group(0)
    
    # Remove invalid control characters (chars 0-31 except tab, newline, carriage return)
    # These can appear when the AI includes raw text from the contract
    json_str = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', json_str)
    
    # Also fix common JSON escape issues in Hebrew text
    # Replace unescaped newlines inside strings (not valid JSON)
    json_str = json_str.replace('\r\n', '\\n').replace('\r', '\\n')
    
    data = json.loads(json_str)
    data.setdefault('is_contract', True)
    data.setdefault('issues', [])
    data.setdefault('summary', "הניתוח הושלם.")
    return data


def create_fallback_response(error_message):
    """Create fallback when parsing fails."""
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


def recalculate_scores(analysis_json):
    """
    חישוב ציון מסונכרן לחלוטין.
    
    עקרון: הניקוד שיורד בכל סעיף = הניקוד שיורד מהקטגוריה שלו.
    
    אלגוריתם:
    1. כל קטגוריה מתחילה ב-20 נקודות
    2. כל penalty מורד מהקטגוריה שלו (לפי prefix)
    3. קטגוריה לא יורדת מתחת ל-0
    4. ציון סופי = סכום 5 הקטגוריות
    
    סנכרון:
    - סכום penalties של F-rules = 20 - financial_terms.score
    - סכום penalties של T-rules = 20 - tenant_rights.score
    - וכו'...
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
    print(f"=== SCORE CALCULATION ===")
    print(f"Issues count: {len(filtered_issues)}")
    for cat, data in score_breakdown.items():
        print(f"  {cat}: {data['score']}/20 (penalties: {data['penalties']})")
    print(f"Overall: {overall_score}/100")
    
    return analysis_json


def lambda_handler(event, context):
    """Main Lambda handler."""
    try:
        sanitized_text = event.get('sanitizedText') or event.get('extractedText', '')
        contract_id = event.get('contractId', 'unknown')
        bucket = event.get('bucket')
        key = event.get('key')
        clauses_list = event.get('clauses', [])
        
        if not sanitized_text:
            return {
                'contractId': contract_id,
                'analysis_result': {'error': 'No text', 'is_contract': False, 'overall_risk_score': 0, 'issues': []},
                'bucket': bucket, 'key': key, 'clauses': clauses_list, 'sanitizedText': ''
            }
        
        MAX_TEXT = 25000
        if len(sanitized_text) > MAX_TEXT:
            sanitized_text = sanitized_text[:MAX_TEXT] + "... [Truncated]"

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
      "explanation": "<הסבר בעברית>",
      "suggested_fix": "<נוסח מתוקן - לא הוראה!>"
    }}
  ]
}}

═══════════════════════════════════════════════════════════════════
� עיקרון מרכזי - לפני כל דיווח שאל את עצמך:
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
6. כל בעיה פעם אחת בלבד - בחר את הכלל החמור ביותר
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

        user_message = {
            "role": "user",
            "content": [{"text": f"נתח את חוזה השכירות הבא:\n\n<contract>\n{sanitized_text}\n</contract>"}]
        }
        
        print(f"Calling {MODEL_ID}")
        ai_output = call_bedrock(MODEL_ID, system_prompt, user_message)
        print("Model call succeeded")
        
        try:
            analysis = parse_json_response(ai_output)
        except Exception as e:
            print(f"Parse error: {e}")
            analysis = create_fallback_response(str(e))
        
        # Python calculates ALL scores
        analysis = recalculate_scores(analysis)
        
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