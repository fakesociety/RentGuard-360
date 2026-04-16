/**
 * useAuthFlow — central state machine for the authentication modal.
 * Manages the entire auth lifecycle: login, register, email verification (OTP),
 * forgot/reset password, Google OAuth, and social-provider conflict handling.
 * Stores pending verification emails in localStorage so users can resume after refresh.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Hub } from 'aws-amplify/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';
import { translateError } from '@/features/auth/utils/errorMapper';

const OAUTH_IN_FLIGHT_KEY = 'rentguard_oauth_in_flight';

const isOAuthFailureEvent = (event) => {
    if (!event) return false;
    return [
        'cognitoHostedUI_failure',
        'signInWithRedirect_failure',
        'customOAuthState_failure',
    ].includes(event);
};

const isOAuthSuccessEvent = (event) => {
    if (!event) return false;
    return [
        'cognitoHostedUI',
        'signInWithRedirect',
        'signedIn',
    ].includes(event);
};

export const useAuthFlow = ({ view, onChangeView, onClose, initialEmail = '' }) => {
    const { login, socialLogin, register, confirmRegistration, isAuthenticated, resendCode, forgotPassword, resetUserPassword, checkUserStatus } = useAuth();
    const { t, isRTL } = useLanguage();

    const getPendingVerificationEmail = () => {
        try {
            return localStorage.getItem('rentguard_pending_verification') || '';
        } catch {
            return '';
        }
    };

    const [email, setEmail] = useState(initialEmail || getPendingVerificationEmail());
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [tempEmail, setTempEmail] = useState(() => getPendingVerificationEmail());
    const dropdownRef = useRef(null);
    const wasOpenRef = useRef(Boolean(view));
    const lastViewedRef = useRef(view || null);
    const oauthInFlightRef = useRef(false);

    const [resetCode, setResetCode] = useState('');
    const [newPassword, setNewPassword] = useState('');

    const [showVerificationSuccess, setShowVerificationSuccess] = useState(false);
    const [showSocialConflictModal, setShowSocialConflictModal] = useState(false);
    const [userExistsStatus, setUserExistsStatus] = useState(null);

    const [showLoginPassword, setShowLoginPassword] = useState(false);
    const [showRegisterPassword, setShowRegisterPassword] = useState(false);
    const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false);
    const [showResetNewPassword, setShowResetNewPassword] = useState(false);

    const resetPasswordVisibilityStates = useCallback(() => {
        setShowLoginPassword(false);
        setShowRegisterPassword(false);
        setShowRegisterConfirmPassword(false);
        setShowResetNewPassword(false);
    }, []);

    const clearAuthPasswordFields = useCallback(() => {
        setPassword('');
        setConfirmPassword('');
    }, []);

    const switchAuthView = useCallback((nextView) => {
        clearAuthPasswordFields();
        resetPasswordVisibilityStates();
        onChangeView(nextView);
    }, [clearAuthPasswordFields, resetPasswordVisibilityStates, onChangeView]);

    useEffect(() => {
        if (initialEmail) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setEmail(initialEmail);
        }
    }, [initialEmail]);

    useEffect(() => {
        const isOpen = Boolean(view);
        if (isOpen && !wasOpenRef.current) {
            if (lastViewedRef.current && view !== lastViewedRef.current) {
                // eslint-disable-next-line react-hooks/set-state-in-effect
                clearAuthPasswordFields();
                resetPasswordVisibilityStates();
            }
        }

        if (isOpen && view) {
            lastViewedRef.current = view;
        }

        wasOpenRef.current = isOpen;
    }, [view, clearAuthPasswordFields, resetPasswordVisibilityStates]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        resetPasswordVisibilityStates();
    }, [view, resetPasswordVisibilityStates]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                if (!e.target.closest('.cta-btn') && !e.target.closest('.auth-btn')) {
                    if (onClose) onClose();
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    useEffect(() => {
        oauthInFlightRef.current = sessionStorage.getItem(OAUTH_IN_FLIGHT_KEY) === '1';

        const stopListening = Hub.listen('auth', ({ payload }) => {
            const event = payload?.event;
            if (!event) return;

            if (isOAuthFailureEvent(event)) {
                const fallbackError = t('auth.socialLoginCanceledOrFailed');
                const eventError = payload?.data?.message || payload?.data?.error || payload?.message;

                setLoading(false);
                setError(translateError(eventError || fallbackError, t, isRTL));
                oauthInFlightRef.current = false;
                sessionStorage.removeItem(OAUTH_IN_FLIGHT_KEY);
            }

            if (isOAuthSuccessEvent(event)) {
                setLoading(false);
                oauthInFlightRef.current = false;
                sessionStorage.removeItem(OAUTH_IN_FLIGHT_KEY);
            }
        });

        return () => {
            stopListening();
        };
    }, [isRTL, t]);

// Effect to intercept OAuth parameters returned natively by Cognito after social login fails (e.g. from Google cancel)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const oauthError = params.get('error');
        const oauthErrorDescription = params.get('error_description');

        if (oauthError) {
            const message = decodeURIComponent(
                oauthErrorDescription || oauthError || t('auth.socialLoginCanceledOrFailed')
            );
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setLoading(false);
            setError(message);
            oauthInFlightRef.current = false;
            sessionStorage.removeItem(OAUTH_IN_FLIGHT_KEY);

            switchAuthView('login');

            setShowSocialConflictModal(false);

            // Clean the messy OAuth query params from the browser URL without refreshing the page
            const cleanUrl = `${window.location.origin}${window.location.pathname}`;
            window.history.replaceState({}, document.title, cleanUrl);
        }
    }, [isRTL, view, onChangeView, switchAuthView, t]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');

        const trimmedEmail = email.trim().toLowerCase();
        const trimmedPassword = password.trim();

        if (!trimmedEmail || !trimmedPassword) {
            setError(t('auth.fillAllFields'));
            return;
        }

        setLoading(true);
        const result = await login(trimmedEmail, password);
        if (!result.success) {
            setError(translateError(result.error || 'Login failed', t, isRTL));
        } else {
            try { localStorage.removeItem('rentguard_pending_verification'); } catch { /* ignore */ }
        }
        setLoading(false);
    };

    const handleSocialLogin = async (provider) => {
        setError('');
        setLoading(true);
        oauthInFlightRef.current = true;
        sessionStorage.setItem(OAUTH_IN_FLIGHT_KEY, '1');

        const result = await socialLogin(provider);
        if (!result?.success) {
            setError(translateError(result?.error || t('auth.socialLoginFailed'), t, isRTL));
            setLoading(false);
            oauthInFlightRef.current = false;
            sessionStorage.removeItem(OAUTH_IN_FLIGHT_KEY);
        }
    };

    const isSocialProviderConflictError = (message) => {
        const value = String(message || '');
        return value.includes('EMAIL_LINKED_SOCIAL_PROVIDER') || value.includes('Email already linked to a social provider');
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');

        if (isAuthenticated) {
            setError(t('auth.logoutToRegister'));
            return;
        }

        const trimmedName = name.trim();
        const trimmedEmail = email.trim().toLowerCase();

        if (!trimmedName || !trimmedEmail || !password) {
            setError(t('auth.fillAllFields'));
            return;
        }

        if (trimmedName.length < 2 || trimmedName.length > 50) {
            setError(t('auth.nameLengthError'));
            return;
        }

        if (password !== confirmPassword) {
            setError(t('auth.passwordsDoNotMatch'));
            return;
        }

        setLoading(true);
        setUserExistsStatus(null);

        // Pre-validate uniqueness with Lambda before passing to Cognito to prevent masked generic errors
        const check = await checkUserStatus(trimmedEmail);

        if (check.status === 'EXISTS') {
            setError(t('auth.accountAlreadyExistsHint'));
            setUserExistsStatus('EXISTS');
            setLoading(false);
            return;
        }

        if (check.status === 'NEEDS_VERIFICATION') {
            setError(t('auth.accountNeedsVerification'));
            setUserExistsStatus('NEEDS_VERIFICATION');
            // Proactively dispatch a new code if they are already registered but unconfirmed
            try { await resendCode(trimmedEmail); } catch (e) { console.error(e); }
            setTempEmail(trimmedEmail);
            localStorage.setItem('rentguard_pending_verification', trimmedEmail);
            switchAuthView('confirm');
            setLoading(false);
            return;
        }

        if (check.status === 'SOCIAL_ONLY') {
            setShowSocialConflictModal(true);
            setError(t('auth.socialAccountOnly'));
            setLoading(false);
            return;
        }

        const result = await register(trimmedEmail, password, trimmedName);
        if (result.success) {
            setTempEmail(trimmedEmail);
            localStorage.setItem('rentguard_pending_verification', trimmedEmail);
            switchAuthView('confirm');
        } else {
            if (isSocialProviderConflictError(result.error)) {
                setShowSocialConflictModal(true);
                setError(t('auth.socialAccountOnly'));
                setLoading(false);
                return;
            }

            let errorMsg = result.error;
            if (isRTL) {
                if (errorMsg.includes('Password')) errorMsg = t('auth.registerPasswordPolicyError');
                else if (errorMsg.includes('email')) errorMsg = t('auth.invalidEmailAddress');
                else if (errorMsg.includes('already exists')) errorMsg = t('auth.accountAlreadyExists');
                else errorMsg = t('auth.registerFailedTryAgain');
            }
            setError(errorMsg);
        }
        setLoading(false);
    };

    const handleConfirm = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const result = await confirmRegistration(tempEmail, code);
        if (result.success) {
            localStorage.removeItem('rentguard_pending_verification');
            setLoading(false);
            switchAuthView(null);
            setShowVerificationSuccess(true);
        } else {
            let errorMsg = result.error;
            if (isRTL) {
                if (errorMsg.includes('Invalid') || errorMsg.includes('code')) errorMsg = t('auth.confirmCodeInvalid');
                else if (errorMsg.includes('expired')) errorMsg = t('auth.confirmCodeExpiredResend');
                else errorMsg = t('auth.verificationFailedTryAgain');
            }
            setError(errorMsg);
            setLoading(false);
        }
    };

    const handleContinueToLogin = () => {
        setShowVerificationSuccess(false);
        switchAuthView('login');
        setEmail(tempEmail);
    };

    const handleResendCode = async () => {
        setError('');
        setLoading(true);
        try {
            await resendCode(tempEmail);
            setError(t('auth.newCodeSent'));
        } catch {
            setError(t('auth.resendCodeFailed'));
        }
        setLoading(false);
    };

    const clearPendingVerification = () => {
        try { localStorage.removeItem('rentguard_pending_verification'); } catch { /* ignore */ }
        setError('');
        setCode('');
        setTempEmail('');
        switchAuthView('register');
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setError('');

        const trimmedEmail = email.trim().toLowerCase();
        if (!trimmedEmail) {
            setError(t('auth.enterEmailAddress'));
            return;
        }

        setLoading(true);
        const result = await forgotPassword(trimmedEmail);
        if (result.success) {
            setTempEmail(trimmedEmail);
            switchAuthView('resetPassword');
        } else {
            setError(translateError(result.error || 'Failed to send reset code', t, isRTL));
        }
        setLoading(false);
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');

        if (!resetCode.trim() || !newPassword.trim()) {
            setError(t('auth.fillAllFields'));
            return;
        }

        setLoading(true);
        const result = await resetUserPassword(tempEmail, resetCode, newPassword);
        if (result.success) {
            switchAuthView('login');
            setEmail(tempEmail);
            setResetCode('');
            setNewPassword('');
            setError('');
        } else {
            setError(translateError(result.error || 'Failed to reset password', t, isRTL));
        }
        setLoading(false);
    };

    const handleResendResetCode = async () => {
        setError('');
        setLoading(true);
        try {
            await forgotPassword(tempEmail);
            setError(t('auth.newCodeSent'));
        } catch {
            setError(t('auth.resendCodeFailed'));
        }
        setLoading(false);
    };

    const toggleAuth = (type) => {
        const pendingEmail = localStorage.getItem('rentguard_pending_verification');
        if (type === 'register' && pendingEmail) {
            setTempEmail(String(pendingEmail || '').trim().toLowerCase());
            setError('');
            switchAuthView('confirm');
            return;
        }
        setError('');
        switchAuthView(view === type ? null : type);
    };

    const isSuccessMessage = error === t('auth.newCodeSent');

    return {
        view, onChangeView, onClose, 
        email, setEmail, password, setPassword, confirmPassword, setConfirmPassword,
        name, setName, code, setCode, error, setError, loading, setLoading,
        tempEmail, setTempEmail, dropdownRef,
        resetCode, setResetCode, newPassword, setNewPassword,
        showVerificationSuccess, setShowVerificationSuccess,
        showSocialConflictModal, setShowSocialConflictModal,
        userExistsStatus, setUserExistsStatus,
        showLoginPassword, setShowLoginPassword,
        showRegisterPassword, setShowRegisterPassword,
        showRegisterConfirmPassword, setShowRegisterConfirmPassword,
        showResetNewPassword, setShowResetNewPassword,
        handleLogin, handleSocialLogin, handleRegister,
        handleConfirm, handleContinueToLogin, handleResendCode,
        clearPendingVerification, handleForgotPassword,
        handleResetPassword, handleResendResetCode,
        switchAuthView, toggleAuth, isSuccessMessage,
        t, isRTL
    };
};
