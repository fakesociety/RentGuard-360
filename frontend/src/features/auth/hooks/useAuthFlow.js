import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';

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

    const [resetCode, setResetCode] = useState('');
    const [newPassword, setNewPassword] = useState('');

    const [showVerificationSuccess, setShowVerificationSuccess] = useState(false);
    const [showSocialConflictModal, setShowSocialConflictModal] = useState(false);
    const [userExistsStatus, setUserExistsStatus] = useState(null);

    const [showLoginPassword, setShowLoginPassword] = useState(false);
    const [showRegisterPassword, setShowRegisterPassword] = useState(false);
    const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false);
    const [showResetNewPassword, setShowResetNewPassword] = useState(false);

    const resetPasswordVisibilityStates = () => {
        setShowLoginPassword(false);
        setShowRegisterPassword(false);
        setShowRegisterConfirmPassword(false);
        setShowResetNewPassword(false);
    };

    const clearAuthPasswordFields = () => {
        setPassword('');
        setConfirmPassword('');
    };

    const switchAuthView = (nextView) => {
        clearAuthPasswordFields();
        resetPasswordVisibilityStates();
        onChangeView(nextView);
    };

    useEffect(() => {
        if (initialEmail) setEmail(initialEmail);
    }, [initialEmail]);

    useEffect(() => {
        const isOpen = Boolean(view);
        if (isOpen && !wasOpenRef.current) {
            if (lastViewedRef.current && view !== lastViewedRef.current) {
                clearAuthPasswordFields();
                resetPasswordVisibilityStates();
            }
        }

        if (isOpen && view) {
            lastViewedRef.current = view;
        }

        wasOpenRef.current = isOpen;
    }, [view]);

    useEffect(() => {
        resetPasswordVisibilityStates();
    }, [view]);

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
        const params = new URLSearchParams(window.location.search);
        const oauthError = params.get('error');
        const oauthErrorDescription = params.get('error_description');

        if (oauthError && view) {
            const message = decodeURIComponent(
                oauthErrorDescription || oauthError || t('auth.socialLoginCanceledOrFailed')
            );
            setError(message);
            switchAuthView('login');
            setShowSocialConflictModal(false);

            const cleanUrl = `${window.location.origin}${window.location.pathname}`;
            window.history.replaceState({}, document.title, cleanUrl);
        }
    }, [isRTL, view, onChangeView]);

    const translateError = (errorMessage) => {
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
            if (errorMessage.includes(english)) return t(key);
        }
        return errorMessage;
    };

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
            setError(translateError(result.error || 'Login failed'));
        } else {
            try { localStorage.removeItem('rentguard_pending_verification'); } catch { }
        }
        setLoading(false);
    };

    const handleSocialLogin = async (provider) => {
        setError('');
        setLoading(true);

        const result = await socialLogin(provider);
        if (!result?.success) {
            setError(translateError(result?.error || t('auth.socialLoginFailed')));
            setLoading(false);
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
        try { localStorage.removeItem('rentguard_pending_verification'); } catch { }
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
            setError(translateError(result.error || 'Failed to send reset code'));
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
            setError(translateError(result.error || 'Failed to reset password'));
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
