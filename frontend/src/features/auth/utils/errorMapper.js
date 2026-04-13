/**
 * Maps server error messages to internationalized text.
 * @param {string} errorMessage - The original error message from the server.
 * @param {function} t - Translation function (i18next).
 * @param {boolean} isRTL - Indicates if current language is Right-to-Left.
 * @returns {string} - Translated or original error message.
 */
export const translateError = (errorMessage, t, isRTL) => {
    if (!isRTL) return errorMessage;

    const errorTranslationKeys = {
        'Attempt limit exceeded, please try after some time': 'auth.errors.attemptLimitExceeded',
        'Invalid verification code provided': 'auth.errors.invalidVerificationCodeProvided',
        'User does not exist': 'auth.errors.userDoesNotExist',
        'Incorrect username or password': 'auth.errors.incorrectUsernameOrPassword',
        'Password did not conform with policy': 'auth.errors.passwordDidNotConformWithPolicy',
        'An account with the given email already exists': 'auth.errors.accountWithEmailAlreadyExists',
        'Invalid password format': 'auth.errors.invalidPasswordFormat',
        'Cannot reset password for the user as there is no registered/verified email': 'auth.errors.cannotResetPasswordNoVerifiedEmail',
        'User is disabled': 'auth.errors.userIsDisabled',
        'Failed to send reset code': 'auth.errors.failedToSendResetCode',
        'Failed to reset password': 'auth.errors.failedToResetPassword',
        'Code mismatch': 'auth.errors.codeMismatch',
        'Expired code': 'auth.errors.expiredCode'
    };

    if (errorTranslationKeys[errorMessage]) return t(errorTranslationKeys[errorMessage]);
    
    for (const [english, key] of Object.entries(errorTranslationKeys)) {
        if (errorMessage && errorMessage.includes && errorMessage.includes(english)) {
            return t(key);
        }
    }
    return errorMessage;
};
