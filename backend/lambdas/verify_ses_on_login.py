"""
=============================================================================
LAMBDA: verify-ses-on-login
Universal SES verification safety net for successful authentications.
=============================================================================

Trigger: Cognito PostAuthentication
Input: Cognito PostAuthentication event
Output: Same event (passed through to Cognito)

Behavior:
  - Runs after every successful login (email/password and federated providers)
  - Extracts user email from Cognito event (or fallback lookup)
  - Checks SES verification status for that email
  - Sends SES verification request only when needed

Security Notes:
  - Never blocks authentication flow (always returns event)
  - Avoids logging sensitive tokens and full event payload

=============================================================================
"""

import os
import boto3

# Keep SES region configurable so teams can verify in a dedicated SES region if needed.
SES_REGION = os.environ.get('SES_REGION')
ses = boto3.client('ses', region_name=SES_REGION) if SES_REGION else boto3.client('ses')
cognito = boto3.client('cognito-idp')


def _normalize_email(value):
    return str(value or '').strip().lower()


def _mask_email(email):
    """Mask email in logs to reduce PII exposure."""
    if '@' not in email:
        return 'unknown'
    local, domain = email.split('@', 1)
    if len(local) <= 2:
        return f"{local[0]}***@{domain}" if local else f"***@{domain}"
    return f"{local[0]}***{local[-1]}@{domain}"


def _extract_email(event):
    """Get user email from event attributes, fallback to admin_get_user when needed."""
    attrs = event.get('request', {}).get('userAttributes', {}) or {}
    email = _normalize_email(attrs.get('email'))
    if email:
        return email

    user_pool_id = event.get('userPoolId') or os.environ.get('USER_POOL_ID')
    username = event.get('userName')

    if not user_pool_id or not username:
        return ''

    try:
        resp = cognito.admin_get_user(UserPoolId=user_pool_id, Username=username)
        for attr in resp.get('UserAttributes', []):
            if attr.get('Name') == 'email':
                return _normalize_email(attr.get('Value'))
    except Exception as exc:
        print(f"Fallback Cognito lookup failed: {exc}")

    return ''


def _get_ses_verification_status(email):
    """Return SES verification status for a single email identity."""
    try:
        resp = ses.get_identity_verification_attributes(Identities=[email])
        attrs = resp.get('VerificationAttributes', {}) or {}
        return attrs.get(email, {}).get('VerificationStatus', 'NotFound')
    except Exception as exc:
        print(f"SES status lookup failed for {_mask_email(email)}: {exc}")
        return 'Unknown'


def lambda_handler(event, context):
    trigger_source = event.get('triggerSource', '')

    # PostAuthentication trigger for all successful sign-ins.
    if trigger_source != 'PostAuthentication_Authentication':
        print(f"Skipping trigger: {trigger_source}")
        return event

    try:
        email = _extract_email(event)
        if not email:
            print('No email found for authenticated user. Skipping SES verification check.')
            return event

        masked = _mask_email(email)
        status = _get_ses_verification_status(email)
        print(f"SES verification status for {masked}: {status}")

        if status == 'Success':
            return event

        # If pending, do not send duplicate requests.
        if status == 'Pending':
            return event

        ses.verify_email_identity(EmailAddress=email)
        print(f"Triggered SES verification for {masked}")

    except Exception as exc:
        # Never fail auth; this Lambda is a best-effort safety net.
        print(f"verify-ses-on-login error: {exc}")

    return event
