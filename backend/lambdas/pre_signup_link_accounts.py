"""
=============================================================================
LAMBDA: pre_signup_link_accounts
Unifies native and social accounts by email during Cognito Pre Sign-up.
=============================================================================

Trigger: Cognito PreSignUp
Input: Cognito PreSignUp event
Output: Same event (passed through to Cognito)

Behavior:
  - PreSignUp_ExternalProvider:
      If a native user already exists with same email, link social identity to
      that native user (native user is Destination in link call).
  - PreSignUp_SignUp:
      If email exists only as social identity(s), block native signup with
      custom error token for frontend handling.

Security Notes:
  - Never trusts client-provided user identifiers for linking decisions.
  - Uses Cognito admin APIs server-side with exact email filtering.

=============================================================================
"""

import json
import os
import boto3


ERROR_TOKEN_SOCIAL_ONLY_EMAIL = 'EMAIL_LINKED_SOCIAL_PROVIDER'

cognito = boto3.client('cognito-idp')


def _normalize_email(value):
    return str(value or '').strip().lower()


def _mask_email(email):
    if '@' not in email:
        return 'unknown'
    local, domain = email.split('@', 1)
    if len(local) <= 2:
        return f"{local[:1]}***@{domain}"
    return f"{local[0]}***{local[-1]}@{domain}"


def _escape_filter_value(value):
    # Cognito filter strings need escaped quotes/backslashes.
    return str(value or '').replace('\\', '\\\\').replace('"', '\\"')


def _attrs_to_map(attributes):
    out = {}
    for a in attributes or []:
        out[a.get('Name')] = a.get('Value')
    return out


def _list_users_by_email(user_pool_id, email):
    filter_value = _escape_filter_value(email)
    response = cognito.list_users(
        UserPoolId=user_pool_id,
        Filter=f'email = "{filter_value}"',
        Limit=60,
    )
    return response.get('Users', [])


def _is_external_provider_user(user):
    # External identities in Cognito appear with UserStatus EXTERNAL_PROVIDER.
    return (user or {}).get('UserStatus') == 'EXTERNAL_PROVIDER'


def _find_native_destination_user(users):
    # Destination must be native so existing Cognito sub remains authoritative.
    for user in users or []:
        if not _is_external_provider_user(user):
            return user
    return None


def _parse_provider_from_username(username):
    # Typical format is Provider_userId, e.g., Google_1234567890.
    value = str(username or '')
    if '_' not in value:
        return '', ''
    provider_prefix, provider_user_id = value.split('_', 1)
    mapping = {
        'google': 'Google',
        'facebook': 'Facebook',
        'loginwithamazon': 'LoginWithAmazon',
        'signinwithapple': 'SignInWithApple',
    }
    provider_name = mapping.get(provider_prefix.lower(), provider_prefix)
    return provider_name, provider_user_id


def _parse_provider_from_identities_attr(identities_json):
    try:
        identities = json.loads(identities_json or '[]')
        if not identities:
            return '', ''
        first = identities[0] or {}
        provider_name = first.get('providerName') or ''
        provider_user_id = first.get('userId') or ''
        return provider_name, provider_user_id
    except Exception:
        return '', ''


def _link_external_to_native(user_pool_id, destination_username, provider_name, provider_user_id):
    cognito.admin_link_provider_for_user(
        UserPoolId=user_pool_id,
        DestinationUser={
            'ProviderName': 'Cognito',
            'ProviderAttributeValue': destination_username,
        },
        SourceUser={
            'ProviderName': provider_name,
            'ProviderAttributeName': 'Cognito_Subject',
            'ProviderAttributeValue': provider_user_id,
        },
    )


def _handle_external_provider_signup(event, user_pool_id, email):
    users = _list_users_by_email(user_pool_id, email)
    destination = _find_native_destination_user(users)
    if not destination:
        # No native account with this email; allow normal social account creation.
        return event

    destination_username = destination.get('Username')
    if not destination_username:
        return event

    provider_name, provider_user_id = _parse_provider_from_username(event.get('userName'))
    if not provider_name or not provider_user_id:
        # Fallback for providers that may not use expected username formatting.
        identities_json = event.get('request', {}).get('userAttributes', {}).get('identities', '')
        provider_name, provider_user_id = _parse_provider_from_identities_attr(identities_json)

    if not provider_name or not provider_user_id:
        print('Missing provider details for external signup; skipping link step.')
        return event

    try:
        _link_external_to_native(user_pool_id, destination_username, provider_name, provider_user_id)
        print(
            f"Linked {provider_name} identity to native destination for {_mask_email(email)} "
            f"(destination={destination_username})"
        )
    except cognito.exceptions.AliasExistsException:
        # Already linked somewhere; let Cognito continue and frontend can resolve if needed.
        print(f"Alias already exists during link for {_mask_email(email)}")
    except cognito.exceptions.InvalidParameterException as exc:
        # If already linked to the same destination, Cognito can throw InvalidParameter.
        print(f"Link skipped due to invalid parameter for {_mask_email(email)}: {exc}")

    event.setdefault('response', {})
    event['response']['autoConfirmUser'] = True
    event['response']['autoVerifyEmail'] = True
    return event


def _handle_native_signup(event, user_pool_id, email):
    users = _list_users_by_email(user_pool_id, email)
    if not users:
        return event

    has_native = any(not _is_external_provider_user(u) for u in users)
    has_external = any(_is_external_provider_user(u) for u in users)

    # Block only when this email belongs exclusively to social identities.
    if has_external and not has_native:
        raise Exception(ERROR_TOKEN_SOCIAL_ONLY_EMAIL)

    return event


def lambda_handler(event, context):
    trigger_source = event.get('triggerSource', '')
    user_pool_id = event.get('userPoolId') or os.environ.get('USER_POOL_ID')

    if not user_pool_id:
        return event

    email = _normalize_email(event.get('request', {}).get('userAttributes', {}).get('email'))
    if not email:
        return event

    if trigger_source == 'PreSignUp_ExternalProvider':
        return _handle_external_provider_signup(event, user_pool_id, email)

    if trigger_source == 'PreSignUp_SignUp':
        return _handle_native_signup(event, user_pool_id, email)

    return event
