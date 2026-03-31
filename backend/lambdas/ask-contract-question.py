"""
=============================================================================
LAMBDA: ask-contract-question
Contract-grounded Q&A using mini-RAG over stored analysis context.
=============================================================================

Trigger: API Gateway (POST /contract-chat/ask)
Input: JSON body with { contractId, question }
Output: JSON with { answer, meta }

Data sources:
  - RentGuard-Analysis table (full_text, clauses_list, analysis_result, userId)
  - RentGuard-ContractChatHistory table (sliding window for conversational memory)

Security:
  - Requires Cognito-authenticated request
  - Verifies contract ownership before answering

Notes:
  - Uses lightweight clause retrieval (keyword overlap), not vector embeddings
  - Falls back to full contract text when retrieval confidence is low
  - Sliding window (last 3 Q&A pairs) + query rewriting for conversational context
=============================================================================
"""

import json
import os
import re
from datetime import datetime, timezone
from uuid import uuid4
import boto3
from botocore.config import Config

ANALYSIS_TABLE = os.environ.get("ANALYSIS_TABLE", "RentGuard-Analysis")
CHAT_HISTORY_TABLE = os.environ.get("CHAT_HISTORY_TABLE", "RentGuard-ContractChatHistory")
MODEL_ID = os.environ.get("MODEL_ID", "us.anthropic.claude-haiku-4-5-20251001-v1:0")
MAX_QUESTION_LENGTH = 1200
MAX_CLAUSES = 6
SLIDING_WINDOW_SIZE = int(os.environ.get("CHAT_SLIDING_WINDOW_SIZE", "6"))
MAX_ANSWER_PREVIEW_CHARS = int(os.environ.get("CHAT_HISTORY_PREVIEW_CHARS", "500"))
PROMPT_VERSION = "v3-conversational-memory"

bedrock = boto3.client(
    service_name="bedrock-runtime",
    region_name=os.environ.get("AWS_REGION", "us-east-1"),
    config=Config(read_timeout=60, connect_timeout=10, retries={"max_attempts": 2}),
)

dynamodb = boto3.resource("dynamodb")
analysis_table = dynamodb.Table(ANALYSIS_TABLE)
chat_history_table = dynamodb.Table(CHAT_HISTORY_TABLE)

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "OPTIONS,POST",
}

STOPWORDS = {
    "the", "and", "with", "from", "that", "this", "what", "when", "where", "which", "about",
    "is", "are", "was", "were", "can", "could", "should", "would", "for", "you", "your",
    "של", "על", "עם", "זה", "מה", "איך", "האם", "אפשר", "יכול", "יכולה", "אני", "אנחנו",
    "בחוזה", "בחוזה?", "סעיף", "סעיפים", "please", "help",
}


def _response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": CORS_HEADERS,
        "body": json.dumps(body, ensure_ascii=False),
    }


def _extract_user_id(event):
    authorizer = event.get("requestContext", {}).get("authorizer", {}) or {}

    claims = authorizer.get("claims") or {}
    if isinstance(claims, dict):
        user_id = claims.get("sub") or claims.get("cognito:username") or claims.get("username")
        if user_id:
            return user_id

    jwt_claims = (authorizer.get("jwt") or {}).get("claims") or {}
    if isinstance(jwt_claims, dict):
        user_id = jwt_claims.get("sub") or jwt_claims.get("cognito:username") or jwt_claims.get("username")
        if user_id:
            return user_id

    principal_id = authorizer.get("principalId")
    if isinstance(principal_id, str) and principal_id.strip():
        return principal_id.strip()

    return None


def _normalize(text):
    if not text:
        return ""
    return re.sub(r"\s+", " ", str(text)).strip()


def _detect_question_language(question):
    return "he" if re.search(r"[\u0590-\u05FF]", question or "") else "en"


def _tokenize(text):
    clean = re.sub(r"[^\w\u0590-\u05FF\s]", " ", (text or "").lower())
    terms = [t for t in clean.split() if len(t) > 2 and t not in STOPWORDS]
    return set(terms)


def _top_relevant_clauses(question, clauses, top_n=MAX_CLAUSES):
    q_tokens = _tokenize(question)
    if not q_tokens or not clauses:
        return []

    scored = []
    for idx, clause in enumerate(clauses):
        text = _normalize(clause)
        if not text:
            continue
        c_tokens = _tokenize(text)
        overlap = len(q_tokens.intersection(c_tokens))
        if overlap > 0:
            scored.append((overlap, idx, text))

    scored.sort(key=lambda x: x[0], reverse=True)
    top = scored[:top_n]
    return [{"index": i + 1, "score": s, "text": t} for s, i, t in top]


def _fetch_sliding_window(user_id, contract_id, window_size=SLIDING_WINDOW_SIZE):
    """Fetch the last N Q&A pairs from chat history for conversational context."""
    try:
        prefix = f"{contract_id}#"
        result = chat_history_table.query(
            KeyConditionExpression="userId = :uid AND begins_with(threadKey, :prefix)",
            ExpressionAttributeValues={":uid": user_id, ":prefix": prefix},
            ScanIndexForward=False,
            Limit=window_size,
        )
        items = result.get("Items", [])
        return list(reversed(items))  # oldest first
    except Exception as exc:
        print(f"sliding window fetch warning: {exc}")
        return []


def _build_history_text(history_items):
    """Format sliding window items into a compact text block."""
    if not history_items:
        return ""

    def _clip(text, max_chars=MAX_ANSWER_PREVIEW_CHARS):
        if len(text) <= max_chars:
            return text
        return f"{text[:max_chars].rstrip()}..."

    turns = []
    for item in history_items:
        q = _normalize(item.get("question"))
        a = _normalize(item.get("answer"))
        if q:
            turns.append(f"User: {q}")
        if a:
            # Keep context compact but informative for follow-up rewriting.
            turns.append(f"Assistant: {_clip(a)}")
    return "\n".join(turns)


def _rewrite_question(question, history_items):
    """Use a fast, cheap Claude call to rewrite a follow-up question into a standalone one.

    If the question already stands on its own, Claude returns it unchanged.
    If there is no history, the rewrite step is skipped entirely.
    """
    if not history_items:
        return question

    history_text = _build_history_text(history_items)
    if not history_text:
        return question

    rewrite_system = (
        "You rewrite follow-up questions into standalone questions. "
        "If the latest question already stands on its own and does not reference "
        "previous messages (using words like 'it', 'that', 'this', 'those', 'זה', 'את זה', 'שלו', 'שלה'), "
        "return it EXACTLY as-is, unchanged. "
        "Return ONLY the rewritten question text, nothing else. "
        "Preserve the original language (Hebrew or English)."
    )

    rewrite_user = (
        f"Chat history:\n{history_text}\n\n"
        f"Latest question:\n{question}\n\n"
        "Rewrite the latest question so it is fully standalone, "
        "or return it unchanged if it already is."
    )

    try:
        raw = _call_model(rewrite_system, rewrite_user)
        rewritten = str(raw or "").strip().strip('"').strip()
        if rewritten:
            print(f"query rewrite: '{question}' -> '{rewritten}'")
            return rewritten
        return question
    except Exception as exc:
        # If rewrite fails, proceed with original question — never block the user.
        print(f"query rewrite warning (using original): {exc}")
        return question


def _build_prompt(question, summary, issues, top_clauses, full_text, use_full_text, conversation_history=""):
    issues_text = []
    for issue in (issues or [])[:6]:
        try:
            issues_text.append(
                f"- {issue.get('rule_id', 'N/A')}: {issue.get('clause_topic', '')} | "
                f"risk={issue.get('risk_level', '')} | explain={issue.get('explanation', '')}"
            )
        except Exception:
            continue

    clause_lines = [f"[{c['index']}] {c['text']}" for c in (top_clauses or [])]

    context_parts = [
        "Contract summary:",
        summary or "No summary available.",
        "",
        "Top identified issues:",
        "\n".join(issues_text) if issues_text else "No structured issues available.",
        "",
        "Most relevant clauses:",
        "\n".join(clause_lines) if clause_lines else "No matching clauses found.",
    ]

    if use_full_text:
        context_parts += ["", "Full contract text:", full_text or ""]

    if conversation_history:
        context_parts += ["", "Recent conversation:", conversation_history]

    context = "\n".join(context_parts)
    output_language = "Hebrew" if _detect_question_language(question) == "he" else "English"

    system_prompt = (
        "You are RentGuard's contract Q&A assistant. "
        "Answer ONLY from the provided contract context, unless the user explicitly requests general advice or consultation. "
        "If the user asks a factual question and the context does not support the answer, say so explicitly. "
        "However, if the user asks for general advice, market standards, negotiation tips, or consultation, you MAY draw upon your general knowledge to provide helpful guidance, and DO NOT robotically state 'The contract does not specify this'. "
        "Do NOT repeat the user question. "
        "Do NOT prefix with labels like 'Answer:' or 'תשובה:'. "
        "Do NOT use markdown. "
        "Keep the answer concise and practical. "
        "Do not provide definitive legal advice; provide contract interpretation and negotiation guidance. "
        "Return ONLY valid JSON and nothing else."
    )

    user_prompt = (
        f"Output language: {output_language}.\n\n"
        f"Context:\n{context}\n\n"
        f"User question:\n{question}\n\n"
        "Return JSON with this exact schema:\n"
        "{\n"
        "  \"answer\": \"your helpful, conversational response\",\n"
        "  \"found_in_contract\": true,\n"
        "  \"evidence\": [\"short clause snippet\"]\n"
        "}\n"
        "Rules:\n"
        "- Set found_in_contract=true ONLY if your answer specifically relies on the provided context.\n"
        "- If found_in_contract=true, evidence must include at least one short quote snippet from the provided context.\n"
        "- If the user asks for general advice, negotiation tips, or market standards, just answer naturally and conversationally without saying 'The contract doesn't contain this'.\n"
        "- evidence must contain 0-3 short snippets quoted from context (no fabrication).\n"
        "- Return ONLY JSON."
    )

    return system_prompt, user_prompt


def _parse_json_response(ai_output_text):
    clean_text = str(ai_output_text or "").replace("```json", "").replace("```", "").strip()
    match = re.search(r"\{.*\}", clean_text, re.DOTALL)
    if not match:
        return None

    json_str = match.group(0)
    json_str = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", json_str)

    try:
        return json.loads(json_str)
    except Exception:
        return None


def _coerce_json_dict(value):
    if isinstance(value, dict):
        return value

    text = str(value or "").strip()
    if not text:
        return None

    parsed = _parse_json_response(text)
    if isinstance(parsed, dict):
        return parsed

    try:
        loaded = json.loads(text)
    except Exception:
        return None

    if isinstance(loaded, dict):
        return loaded

    if isinstance(loaded, str):
        nested = _parse_json_response(loaded)
        if isinstance(nested, dict):
            return nested

    return None


def _unwrap_nested_answer_text(answer_text):
    candidate = str(answer_text or "").strip()
    if not candidate:
        return ""

    for _ in range(4):
        advanced = False

        parsed = _coerce_json_dict(candidate)
        if isinstance(parsed, dict):
            nested_answer = parsed.get("answer")
            if isinstance(nested_answer, str):
                nested_answer = nested_answer.strip()
                if nested_answer and nested_answer != candidate:
                    candidate = nested_answer
                    advanced = True

        if advanced:
            continue

        try:
            loaded = json.loads(candidate)
        except Exception:
            loaded = None

        if isinstance(loaded, str):
            loaded_text = loaded.strip()
            if loaded_text and loaded_text != candidate:
                candidate = loaded_text
                advanced = True

        if not advanced:
            break

    return candidate


def _extract_answer_via_regex(raw_text):
    """Best-effort recovery when model output is truncated/invalid JSON."""
    match = re.search(r'"answer"\s*:\s*"((?:\\.|[^"\\])*)"', str(raw_text or ""), re.DOTALL)
    if not match:
        return ""

    try:
        return json.loads(f'"{match.group(1)}"').strip()
    except Exception:
        return match.group(1).replace("\\n", "\n").replace('\\"', '"').strip()


def _clean_answer_text(answer_text, question):
    answer = _unwrap_nested_answer_text(answer_text)
    if not answer:
        return ""

    if answer.startswith("```") or '"answer"' in answer:
        rescued = _extract_answer_via_regex(answer)
        if rescued:
            answer = rescued

    answer = re.sub(r"^\s*```(?:json)?\s*", "", answer, flags=re.IGNORECASE)
    answer = re.sub(r"\s*```\s*$", "", answer).strip()

    if not answer:
        return ""

    answer = re.sub(r"^\s*(?:תשובה|answer)\s*[:-]\s*", "", answer, flags=re.IGNORECASE).strip()

    normalized_question = _normalize(question)
    if normalized_question:
        answer = re.sub(
            rf"^\s*(?:שאלה|question)\s*[:-]\s*{re.escape(normalized_question)}\s*",
            "",
            answer,
            flags=re.IGNORECASE,
        ).strip()

    answer = re.sub(r"\n{3,}", "\n\n", answer).strip()
    return answer


def _extract_answer(raw_model_output, question):
    parsed = _coerce_json_dict(raw_model_output)
    if isinstance(parsed, dict):
        answer = _clean_answer_text(parsed.get("answer", ""), question)

        nested_payload = _coerce_json_dict(parsed.get("answer", ""))
        if not answer and isinstance(nested_payload, dict):
            answer = _clean_answer_text(nested_payload.get("answer", ""), question)

        evidence = parsed.get("evidence")
        if not isinstance(evidence, list) and isinstance(nested_payload, dict):
            evidence = nested_payload.get("evidence")
        if not isinstance(evidence, list):
            evidence = []
        evidence = [str(item).strip() for item in evidence if str(item).strip()][:3]

        found_in_contract = parsed.get("found_in_contract")
        if not isinstance(found_in_contract, bool) and isinstance(nested_payload, dict):
            found_in_contract = nested_payload.get("found_in_contract")
        if isinstance(found_in_contract, bool):
            found = found_in_contract
        else:
            found = None

        if found is True and not evidence:
            found = False

        return (answer or "No answer generated."), found, evidence

    return _clean_answer_text(raw_model_output, question) or "No answer generated.", None, []


def _call_model(system_prompt, user_prompt):
    response = bedrock.converse(
        modelId=MODEL_ID,
        system=[{"text": system_prompt}],
        messages=[{"role": "user", "content": [{"text": user_prompt}]}],
        inferenceConfig={"maxTokens": 700, "temperature": 0.2},
    )

    message = response.get("output", {}).get("message", {})
    content = message.get("content", [])
    if not content:
        return "No answer generated."
    return content[0].get("text", "No answer generated.").strip()


def _persist_history(user_id, contract_id, question, answer, meta):
    """Best-effort history persistence; failures should not fail the main answer path."""
    try:
        now = datetime.now(timezone.utc).isoformat()
        message_id = str(uuid4())
        thread_key = f"{contract_id}#{now}#{message_id}"

        chat_history_table.put_item(
            Item={
                "userId": user_id,
                "threadKey": thread_key,
                "messageId": message_id,
                "contractId": contract_id,
                "question": question,
                "answer": answer,
                "createdAt": now,
                "meta": meta or {},
            }
        )

        return {
            "messageId": message_id,
            "createdAt": now,
        }
    except Exception as exc:
        print(f"history persist warning: {exc}")
        return None


def lambda_handler(event, context):
    if event.get("httpMethod") == "OPTIONS":
        return _response(200, {"ok": True})

    try:
        user_id = _extract_user_id(event)
        if not user_id:
            authorizer = event.get("requestContext", {}).get("authorizer", {}) or {}
            print(
                "ask-contract-question unauthorized: "
                f"authorizer_keys={list(authorizer.keys())}"
            )
            return _response(401, {"error": "Unauthorized"})

        body = json.loads(event.get("body") or "{}")
        contract_id = _normalize(body.get("contractId"))
        question = _normalize(body.get("question"))

        if not contract_id:
            return _response(400, {"error": "Missing contractId"})
        if not question:
            return _response(400, {"error": "Missing question"})
        if len(question) > MAX_QUESTION_LENGTH:
            return _response(400, {"error": f"Question too long (max {MAX_QUESTION_LENGTH} chars)"})

        item = analysis_table.get_item(Key={"contractId": contract_id}).get("Item")
        if not item:
            return _response(404, {"error": "Contract analysis not found"})

        stored_user_id = item.get("userId")
        if stored_user_id and stored_user_id != user_id:
            return _response(403, {"error": "Access denied - contract belongs to another user"})

        # --- Sliding Window: fetch recent conversation history ---
        history_items = _fetch_sliding_window(user_id, contract_id)

        # --- Query Rewriting: make follow-up questions standalone ---
        rewritten_question = _rewrite_question(question, history_items)

        analysis = item.get("analysis_result") or {}
        summary = _normalize(analysis.get("summary"))
        issues = analysis.get("issues") or []
        clauses = item.get("clauses_list") or []
        full_text = _normalize(item.get("full_text"))

        # Use the REWRITTEN question for clause retrieval (better keyword matching).
        top_clauses = _top_relevant_clauses(rewritten_question, clauses)
        low_confidence = len(top_clauses) == 0

        # Build conversation history text for the final prompt.
        conversation_history = _build_history_text(history_items)

        system_prompt, user_prompt = _build_prompt(
            question=rewritten_question,
            summary=summary,
            issues=issues,
            top_clauses=top_clauses,
            full_text=full_text if low_confidence else "",
            use_full_text=low_confidence,
            conversation_history=conversation_history,
        )

        raw_answer = _call_model(system_prompt, user_prompt)
        answer, found_in_contract, evidence = _extract_answer(raw_answer, rewritten_question)

        response_meta = {
            "contractId": contract_id,
            "usedFullTextFallback": low_confidence,
            "selectedClauses": len(top_clauses),
            "modelId": MODEL_ID,
            "promptVersion": PROMPT_VERSION,
            "usedConversationalMemory": len(history_items) > 0,
        }
        if rewritten_question != question:
            response_meta["rewrittenQuestion"] = rewritten_question
        if found_in_contract is not None:
            response_meta["foundInContract"] = found_in_contract
        if evidence:
            response_meta["evidence"] = evidence

        # Persist history with the ORIGINAL question (what the user typed).
        persisted = _persist_history(
            user_id=user_id,
            contract_id=contract_id,
            question=question,
            answer=answer,
            meta=response_meta,
        )

        created_at = (persisted or {}).get("createdAt")
        message_id = (persisted or {}).get("messageId")

        return _response(
            200,
            {
                "answer": answer,
                "meta": response_meta,
                "createdAt": created_at,
                "messageId": message_id,
            },
        )

    except Exception as exc:
        print(f"ask-contract-question error: {exc}")
        return _response(500, {"error": "Internal server error"})
