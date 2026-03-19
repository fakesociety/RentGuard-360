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

Security:
  - Requires Cognito-authenticated request
  - Verifies contract ownership before answering

Notes:
  - Uses lightweight clause retrieval (keyword overlap), not vector embeddings
  - Falls back to full contract text when retrieval confidence is low
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
PROMPT_VERSION = "v2-json-guarded"

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


def _build_prompt(question, summary, issues, top_clauses, full_text, use_full_text):
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

    context = "\n".join(context_parts)
    output_language = "Hebrew" if _detect_question_language(question) == "he" else "English"

    system_prompt = (
        "You are RentGuard's contract Q&A assistant. "
        "Answer ONLY from the provided contract context. "
        "If context does not support the answer, say so explicitly. "
        "Do NOT repeat the user question. "
        "Do NOT prefix with labels like 'Answer:' or 'תשובה:'. "
        "Do NOT use markdown. "
        "Keep the answer concise and practical. "
        "Do not provide definitive legal advice; provide contract interpretation guidance. "
        "Return ONLY valid JSON and nothing else."
    )

    user_prompt = (
        f"Output language: {output_language}.\n\n"
        f"Context:\n{context}\n\n"
        f"User question:\n{question}\n\n"
        "Return JSON with this exact schema:\n"
        "{\n"
        "  \"answer\": \"string\",\n"
        "  \"found_in_contract\": true,\n"
        "  \"evidence\": [\"short clause snippet\"]\n"
        "}\n"
        "Rules:\n"
        "- If answer is unsupported, set found_in_contract=false and explain briefly in answer.\n"
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


def _clean_answer_text(answer_text, question):
    answer = str(answer_text or "").strip()
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
    parsed = _parse_json_response(raw_model_output)
    if isinstance(parsed, dict):
        answer = _clean_answer_text(parsed.get("answer", ""), question)
        evidence = parsed.get("evidence")
        if not isinstance(evidence, list):
            evidence = []
        evidence = [str(item).strip() for item in evidence if str(item).strip()][:3]

        found_in_contract = parsed.get("found_in_contract")
        if isinstance(found_in_contract, bool):
            found = found_in_contract
        else:
            found = None

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

        analysis = item.get("analysis_result") or {}
        summary = _normalize(analysis.get("summary"))
        issues = analysis.get("issues") or []
        clauses = item.get("clauses_list") or []
        full_text = _normalize(item.get("full_text"))

        top_clauses = _top_relevant_clauses(question, clauses)
        low_confidence = len(top_clauses) == 0

        system_prompt, user_prompt = _build_prompt(
            question=question,
            summary=summary,
            issues=issues,
            top_clauses=top_clauses,
            full_text=full_text if low_confidence else "",
            use_full_text=low_confidence,
        )

        raw_answer = _call_model(system_prompt, user_prompt)
        answer, found_in_contract, evidence = _extract_answer(raw_answer, question)

        response_meta = {
            "contractId": contract_id,
            "usedFullTextFallback": low_confidence,
            "selectedClauses": len(top_clauses),
            "modelId": MODEL_ID,
            "promptVersion": PROMPT_VERSION,
        }
        if found_in_contract is not None:
            response_meta["foundInContract"] = found_in_contract
        if evidence:
            response_meta["evidence"] = evidence

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
