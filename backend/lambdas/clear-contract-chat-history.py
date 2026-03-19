"""
=============================================================================
LAMBDA: clear-contract-chat-history
Deletes persisted chat history for a specific contract owned by the user.
=============================================================================

Trigger: API Gateway (DELETE /contract-chat/history)
Input: Query params { contractId }
Output: { clearedCount }

Security:
  - Requires Cognito-authenticated request
  - Verifies contract ownership via analysis table
=============================================================================
"""

import json
import os
from urllib.parse import parse_qs
import boto3
from boto3.dynamodb.conditions import Key
from boto3.dynamodb.conditions import Attr

ANALYSIS_TABLE = os.environ.get("ANALYSIS_TABLE", "RentGuard-Analysis")
CHAT_HISTORY_TABLE = os.environ.get("CHAT_HISTORY_TABLE", "RentGuard-ContractChatHistory")
CODE_VERSION = "clear-v4-fallback-scan"


dynamodb = boto3.resource("dynamodb")
analysis_table = dynamodb.Table(ANALYSIS_TABLE)
chat_table = dynamodb.Table(CHAT_HISTORY_TABLE)

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "OPTIONS,DELETE",
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


def _verify_ownership(user_id, contract_id):
    item = analysis_table.get_item(Key={"contractId": contract_id}).get("Item")
    # Do not block clear if analysis record was removed/archived; we can still clear by user ownership in chat table.
    if not item:
        return None

    stored_user_id = item.get("userId")
    if stored_user_id and stored_user_id != user_id:
        return _response(403, {"error": "Access denied - contract belongs to another user"})

    return None


def _extract_contract_id(event):
    params = event.get("queryStringParameters") or {}
    contract_id = (params.get("contractId") or "").strip()
    if contract_id:
        return contract_id

    raw_qs = event.get("rawQueryString") or ""
    if isinstance(raw_qs, str) and raw_qs:
        try:
            parsed = parse_qs(raw_qs, keep_blank_values=False)
            candidate = ((parsed.get("contractId") or [""])[0] or "").strip()
            if candidate:
                return candidate
        except Exception as exc:
            print(f"clear-contract-chat-history rawQueryString parse failed: {exc}")

    body = event.get("body")
    if isinstance(body, str) and body.strip():
        try:
            parsed_body = json.loads(body)
            if isinstance(parsed_body, dict):
                candidate = (parsed_body.get("contractId") or "").strip()
                if candidate:
                    return candidate
        except Exception:
            pass

    return ""


def _get_chat_table_key_names():
    try:
        desc = chat_table.meta.client.describe_table(TableName=CHAT_HISTORY_TABLE).get("Table", {})
        key_schema = desc.get("KeySchema", [])
        hash_key = next((k.get("AttributeName") for k in key_schema if k.get("KeyType") == "HASH"), None)
        range_key = next((k.get("AttributeName") for k in key_schema if k.get("KeyType") == "RANGE"), None)
        return hash_key, range_key
    except Exception as exc:
        print(f"clear-contract-chat-history key schema describe failed: {exc}")
        return "userId", "threadKey"


def _collect_history_items(user_id, contract_id, hash_key, range_key):
    prefix = f"{contract_id}#"
    items = []

    # Fast path for the expected schema.
    if hash_key == "userId" and range_key:
        try:
            last_evaluated_key = None
            while True:
                query_kwargs = {
                    "KeyConditionExpression": Key("userId").eq(user_id) & Key(range_key).begins_with(prefix),
                    "ScanIndexForward": False,
                }
                if last_evaluated_key:
                    query_kwargs["ExclusiveStartKey"] = last_evaluated_key

                result = chat_table.query(**query_kwargs)
                items.extend(result.get("Items", []))
                last_evaluated_key = result.get("LastEvaluatedKey")
                if not last_evaluated_key:
                    return items
        except Exception as exc:
            print(f"clear-contract-chat-history query fallback to scan: {exc}")

    # Compatible fallback for legacy/unexpected table schema.
    filter_expr = Attr("userId").eq(user_id)
    if range_key == "threadKey":
        filter_expr = filter_expr & Attr("threadKey").begins_with(prefix)
    else:
        filter_expr = filter_expr & (
            Attr("contractId").eq(contract_id) | Attr("threadKey").begins_with(prefix)
        )

    last_evaluated_key = None
    while True:
        scan_kwargs = {"FilterExpression": filter_expr}
        if last_evaluated_key:
            scan_kwargs["ExclusiveStartKey"] = last_evaluated_key

        result = chat_table.scan(**scan_kwargs)
        items.extend(result.get("Items", []))
        last_evaluated_key = result.get("LastEvaluatedKey")
        if not last_evaluated_key:
            break

    return items


def lambda_handler(event, context):
    method = (event.get("httpMethod") or event.get("requestContext", {}).get("http", {}).get("method") or "").upper()
    if method == "OPTIONS":
        return _response(200, {"ok": True})

    try:
        print(f"clear-contract-chat-history code_version={CODE_VERSION}")

        user_id = _extract_user_id(event)
        if not user_id:
            authorizer = event.get("requestContext", {}).get("authorizer", {}) or {}
            print(
                "clear-contract-chat-history unauthorized: "
                f"authorizer_keys={list(authorizer.keys())}"
            )
            return _response(401, {"error": "Unauthorized"})

        contract_id = _extract_contract_id(event)
        if not contract_id:
            return _response(400, {"error": "Missing contractId"})

        ownership_error = _verify_ownership(user_id, contract_id)
        if ownership_error:
            return ownership_error

        hash_key, range_key = _get_chat_table_key_names()
        items = _collect_history_items(user_id, contract_id, hash_key, range_key)

        cleared_count = 0
        with chat_table.batch_writer() as batch:
            for item in items:
                hash_value = item.get(hash_key) if hash_key else None
                range_value = item.get(range_key) if range_key else None

                if not hash_key or hash_value is None:
                    continue

                delete_key = {hash_key: hash_value}
                if range_key:
                    if range_value is None:
                        continue
                    delete_key[range_key] = range_value

                batch.delete_item(
                    Key=delete_key
                )
                cleared_count += 1

        return _response(200, {"clearedCount": cleared_count})

    except Exception as exc:
        print(f"clear-contract-chat-history error: {exc}")
        return _response(500, {"error": "Internal server error"})
