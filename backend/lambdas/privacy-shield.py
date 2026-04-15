"""
=============================================================================
LAMBDA: privacy-shield
Sanitizes extracted contract text for privacy and prepares for analysis
=============================================================================

Trigger: Step Functions (after RentGuard_AzureOCR)
Input: Extracted text from PDF, contractId, bucket, key
Output: Sanitized text, clauses list

Processing Steps:
  1. Detect and fix reversed text (mirror text from some scanners)
  2. Mask PII (ID numbers, credit cards, phones, emails, bank accounts)
  3. Remove OCR noise (scanner watermarks, special characters)
  4. Split text into clauses for display

=============================================================================
"""

# =============================================================================
# IMPORTS
# =============================================================================

import re
import logging

# =============================================================================
# CONFIGURATION
# =============================================================================

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Patterns for detecting and masking PII (Personally Identifiable Information)
# NOTE: Replacement strings are in Hebrew because they appear in the displayed contract text
PII_PATTERNS = {
    'israeli_id': (re.compile(r'\b[0-9]{8,9}\b'), '[ת.ז. הוסתר]'),
    'credit_card': (re.compile(r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b'), '[כ.אשראי הוסתר]'),
    'phone_mobile': (re.compile(r'\b05\d[-\s]?\d{3}[-\s]?\d{4}\b'), '[נייד הוסתר]'),
    'email': (re.compile(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'), '[אימייל הוסתר]'),
    'bank_account': (re.compile(r'\b\d{2,3}[-\s]?\d{3}[-\s]?\d{6,9}\b'), '[חשבון בנק הוסתר]'),
}

# Patterns for cleaning OCR scanner noise
OCR_NOISE_PATTERNS = [
    re.compile(r'(?i)scanned with camscanner.*'),
    re.compile(r'(?i)www\.camscanner\.com'),
    re.compile(r'[\u2000-\u200f]'),  # Hidden directional characters
    re.compile(r'[|~^§`®©™]'),       # Special characters (usually OCR errors)
    re.compile(r'[_]{3,}'),          # Long underlines
]

# Keywords for text direction detection (normal vs. reversed)
KEYWORDS_NORMAL = ['חוזה', 'הסכם', 'שכירות', 'משכיר', 'שוכר', 'דירה']
KEYWORDS_REVERSED = ['הזוח', 'םכסה', 'תוריכש', 'ריכשמ', 'רכוש', 'הריד']



# Section headers commonly found in rental contracts
SECTION_HEADERS = [
    'מבוא', 'הואיל', 'לפיכך',
    'תקופת השכירות', 'תקופת האופציה', 'הארכת החוזה',
    'דמי השכירות', 'דמי שכירות', 'תשלומים',
    'מיסים, אגרות ותשלומים', 'מיסים ותשלומים',
    'השימוש והחזקה', 'השימוש במושכר', 'החזקת המושכר',
    'אחריות לנזק', 'אחריות', 'נזקים',
    'פינוי המושכר', 'פינוי הדירה', 'פינוי',
    'בטחונות', 'ערבויות', 'ערבות', 'ביטחונות',
    'הפרות', 'הפרה יסודית', 'ביטול ההסכם',
    'שונות', 'הוראות כלליות', 'כללי',
    'חתימות', 'חתימה',
]

PREAMBLE_SPLIT_PATTERN = re.compile(
    r'^\s*(?:מצד\s+אחד|מצד\s+שני|הואיל\s+ו|והואיל\s+ו|לפיכך(?:\s+הוסכם)?)(?::|$)'
)

HEBREW_CHAR_PATTERN = re.compile(r'[\u0590-\u05FF]')
NUMBERED_PREFIX_PATTERN = re.compile(r'^\d{1,2}(?:\s*\.\s*\d{1,2})*\.?\s+')
LEADING_DOT_NUMBER_PATTERN = re.compile(r'^\.(\d{1,2}(?:\.\d{1,2}){0,2})\s+')
TRAILING_CLAUSE_NUMBER_PATTERN = re.compile(
    # Match trailing clause numbers only when they include an explicit leading or trailing dot.
    # Prevents moving plain values like "50" or "1.9" to the beginning of a sentence.
    r'^(?P<body>[\u0590-\u05FF][^\n]{3,}?)\s+(?P<number>\.\d{1,2}(?:\s*\.\s*\d{1,2}){0,2}\.?|\d{1,2}(?:\s*\.\s*\d{1,2}){0,2}\.)\s*$'
)
INLINE_SUBCLAUSE_PATTERN = re.compile(
    r'(?<=\S)\s+(?=(\d{1,2}(?:\s*\.\s*\d{1,2}){1,2}\.)\s*[\u0590-\u05FF])'
)
FORBIDDEN_TRAILING_WORDS = {
    'של', 'על', 'את', 'מן', 'ביום', 'בסך', 'עם', 'עד', 'ללא', 'עבור'
}

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def _format_clause_number(raw_number: str) -> str:
    """Normalizes a clause number token to a canonical form like '6.' or '6.1.'."""
    number = raw_number.strip().strip('.')
    if not number:
        return raw_number.strip()

    parts = [part for part in number.split('.') if part]
    if not parts:
        return raw_number.strip()

    return f"{'.'.join(parts)}."


def _looks_like_truncated_sentence(body: str) -> bool:
    """Heuristic guard to avoid flipping numeric values at the end of sentence fragments."""
    words = body.split()
    if not words:
        return False

    last_word = words[-1]
    if last_word in FORBIDDEN_TRAILING_WORDS:
        return True

    # A dangling one-letter token often indicates the line continues on the next OCR row.
    if len(last_word) == 1 and last_word in {'ב', 'ל', 'כ', 'מ', 'ש', 'ו'}:
        return True

    return False


def normalize_rtl_clause_layout(text: str) -> str:
    """
    Fixes common OCR RTL layout issues for Hebrew contracts.

    Handles two noisy patterns seen in OCR output:
    1) Heading number moved to the end: "תקופת האופציה .6" -> "6. תקופת האופציה"
    2) Inline sub-clause without newline: "... 6.1. ..." -> inserted line break before 6.1.
    """
    if not text:
        return text

    normalized = text.replace('\r\n', '\n').replace('\r', '\n')

    # Break inline nested clauses onto a new line: "... 6.1. ..." -> "...\n6.1. ..."
    normalized = INLINE_SUBCLAUSE_PATTERN.sub('\n', normalized)

    fixed_lines = []
    for raw_line in normalized.split('\n'):
        line = raw_line.strip()
        if not line:
            fixed_lines.append('')
            continue

        # Fix pattern like ".6 כותרת" -> "6. כותרת"
        line = LEADING_DOT_NUMBER_PATTERN.sub(
            lambda m: f"{_format_clause_number(m.group(1))} ",
            line
        )

        # Fix pattern like "תקופת האופציה .6" -> "6. תקופת האופציה"
        trailing_match = TRAILING_CLAUSE_NUMBER_PATTERN.match(line)
        if trailing_match:
            body = trailing_match.group('body').strip().rstrip('.,;:-')
            number = _format_clause_number(trailing_match.group('number'))

            if HEBREW_CHAR_PATTERN.search(body) and not NUMBERED_PREFIX_PATTERN.match(body):
                if not _looks_like_truncated_sentence(body):
                    line = f"{number} {body}"

        fixed_lines.append(line)

    normalized = '\n'.join(fixed_lines)
    normalized = re.sub(r'\n{3,}', '\n\n', normalized)
    return normalized.strip()

def detect_and_fix_direction(text: str) -> str:
    """
    Detects if text is reversed (mirror text) and fixes it.
    Some scanners produce reversed Hebrew text.
    
    Args:
        text: Raw extracted text
    
    Returns:
        str: Corrected text (reversed if needed)
    """
    score_normal = sum(1 for word in KEYWORDS_NORMAL if word in text)
    score_reversed = sum(1 for word in KEYWORDS_REVERSED if word in text)
    
    if score_reversed > score_normal:
        logger.info(f"Reversed text detected (Score: {score_reversed} vs {score_normal}). Fixing...")
        fixed_lines = [line[::-1] for line in text.split('\n')]
        return '\n'.join(fixed_lines)
    
    return text


def sanitize_pii(text: str) -> tuple[str, list[str]]:
    """
    Masks personally identifiable information in text.
    
    Args:
        text: Text containing potential PII
    
    Returns:
        tuple: (sanitized text, list of PII types found)
    """
    pii_found = []
    for pii_type, (pattern, replacement) in PII_PATTERNS.items():
        if pattern.search(text):
            pii_found.append(pii_type)
            text = pattern.sub(replacement, text)
    return text, pii_found


def clean_ocr_noise(text: str) -> str:
    """
    Removes scanner app watermarks and OCR artifacts.
    
    Args:
        text: Text with potential OCR noise
    
    Returns:
        str: Cleaned text
    """
    for pattern in OCR_NOISE_PATTERNS:
        text = pattern.sub(' ', text)
    
    # Collapse multiple spaces and empty lines
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r'\n\s*\n\s*\n+', '\n\n', text)
    return text.strip()


def truncate_appendices(text: str) -> str:
    """
    Truncates low-quality OCR appendix/signature sections that often break UI rendering.

    Keeps the main contract body and appends a clear note for users to consult the original file.
    """
    pattern = re.compile(
        r'(?im)^\s*(?:ולראיה באו הצדדים על החתום|נספח\s+א[\'\u05F3\u05F4\"]?\s*(?:-|$)|נספח\s+א\b)'
    )
    match = pattern.search(text)

    if match:
        truncated_text = text[:match.start()].strip()
        disclaimer = (
            "\n\n[הערת מערכת: המשך המסמך המקורי, לרבות טבלאות ונספחים, "
            "הוסר מתצוגה זו באופן אוטומטי כדי למנוע שיבושי טקסט. "
            "אנא עיינו בקובץ המקורי.]"
        )
        return truncated_text + disclaimer

    return text


def split_to_clauses(text: str) -> list[str]:
    """
    Splits contract text into individual clauses for display.
    
    Identifies:
    - Section headers (common rental contract sections)
    - Numbered clauses (1., 2., etc.)
    - Hebrew letter clauses (א., ב., etc.)
    
    Avoids splitting on:
    - Money amounts (5,200 NIS)
    - Dates (26.10.25)
    
    Args:
        text: Full contract text
    
    Returns:
        list: Individual clauses
    """
    # Regex for clause numbers (not money or dates)
    CLAUSE_NUMBER_PATTERN = re.compile(
        r'(?:^|(?<=\s)|(?<=\n))'
        r'('
        r'[0-9]{1,2}(?:\s*\.\s*[0-9]{1,2})+(?:\.)?'
        r'|'
        r'[0-9]{1,2}[.\)-]'
        r'|'
        r'[א-י][.\)-]'
        r')\s+'
        r'(?![0-9,]+\s*(?:ש[״\']?ח|₪|שקל|אלף))'
        r'(?![0-9]{1,2}[./][0-9])'
    )
    
    lines = text.split('\n')
    clauses = []
    current_clause = ""
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        is_header = any(header in line for header in SECTION_HEADERS)
        is_numbered_clause = bool(CLAUSE_NUMBER_PATTERN.match(line))
        is_preamble_boundary = bool(PREAMBLE_SPLIT_PATTERN.match(line))
        is_new_clause = is_header or is_numbered_clause or is_preamble_boundary
        
        if is_new_clause:
            if current_clause and len(current_clause.strip()) > 15:
                clauses.append(current_clause.strip())
            current_clause = line
        else:
            if current_clause:
                current_clause += "\n" + line
            else:
                current_clause = line
    
    if current_clause and len(current_clause.strip()) > 15:
        clauses.append(current_clause.strip())
    
    # Pattern to split multiple clauses on the same line
    # Matches: space + digit(s) + period + space, but NOT money or dates
    #   (?<=\S)\s+             - After non-whitespace, then whitespace
    #   ([0-9]{1,2})\.\s+      - Number + period + space
    #   (?![0-9,]+...)         - NOT followed by money amounts
    #   (?=[\u0590-\u05FF])    - MUST be followed by Hebrew letter
    split_pattern = re.compile(
        r'(?<=\S)\s+'
        r'('
        r'[0-9]{1,2}(?:\s*\.\s*[0-9]{1,2})+(?:\.)?'
        r'|'
        r'[0-9]{1,2}[.\)-]'
        r'|'
        r'[א-י][.\)-]'
        r')\s+'
        r'(?![0-9,]+\s*(?:ש[״\']?ח|₪))'
        r'(?![0-9]{1,2}[./][0-9])'
        r'(?=[\u0590-\u05FF])'
    )
    
    final_clauses = []  # Initialize final_clauses list
    
    for clause in clauses:
        split_points = [(m.start(), m.group(1)) for m in split_pattern.finditer(clause)]
        
        if split_points:
            prev_pos = 0
            for pos, num in split_points:
                sub_clause = clause[prev_pos:pos].strip()
                if len(sub_clause) > 15:
                    final_clauses.append(sub_clause)
                prev_pos = pos + 1
            last_part = clause[prev_pos:].strip()
            if len(last_part) > 15:
                final_clauses.append(last_part)
        else:
            if len(clause) > 15:
                final_clauses.append(clause)
    
    # Final cleanup
    cleaned = []
    for clause in final_clauses:
        clause = clause.replace('\r\n', '\n').replace('\r', '\n')
        clause = re.sub(r'[ \t]{3,}', '\n', clause)

        # Preserve meaningful OCR line breaks (especially in the contract preamble)
        # while still cleaning spacing noise on each line.
        normalized_lines = []
        for raw_line in clause.split('\n'):
            compact_line = re.sub(r'[ \t]+', ' ', raw_line).strip()
            if compact_line:
                normalized_lines.append(compact_line)

        clause = '\n'.join(normalized_lines)
        clause = re.sub(r'\n{3,}', '\n\n', clause).strip()
        if not re.match(r'^[\d\W]+$', clause.replace('\n', ' ')):
            cleaned.append(clause)
    
    return cleaned



# =============================================================================
# MAIN HANDLER
# =============================================================================

def lambda_handler(event, context):
    """
    Main Lambda entry point - sanitizes extracted contract text.
    
    Args:
        event: Step Functions event with extractedText, contractId, bucket, key
        context: AWS Lambda context object
    
    Returns:
        dict: Sanitized text, clauses list, piiFound
    """
    try:
        text = event.get('extractedText', '')
        contract_id = event.get('contractId', 'unknown')
        bucket = event.get('bucket')
        key = event.get('key')
        
        logger.info(f"Processing contract {contract_id}, length: {len(text)}")
        
        if not text:
            return {
                'error': 'No text extracted',
                'sanitizedText': ''
            }
        
        # 1. Fix text direction (reversed text from some scanners)
        text = detect_and_fix_direction(text)

        # 2. Restore Hebrew RTL structure damaged by OCR ordering
        text = normalize_rtl_clause_layout(text)

        # 3. Mask PII
        text, pii_found = sanitize_pii(text)
        
        # 4. Clean OCR noise
        text = clean_ocr_noise(text)

        # 4.5. Remove appendix/signature OCR tables that cause severe whitespace corruption
        text = truncate_appendices(text)
        
        # 5. Split into clauses
        clauses_list = split_to_clauses(text)
        
        return {
            'contractId': contract_id,
            'sanitizedText': text,
            'clauses': clauses_list,
            'piiFound': pii_found,
            'bucket': bucket,
            'key': key
        }
        
    except Exception as e:
        logger.error(f"Error: {str(e)}")
        raise e