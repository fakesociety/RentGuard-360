/**
 * ============================================
 *  AuthModal Component
 *  Unified authentication modal (Login/Register/Confirm)
 * ============================================
 * 
 * STRUCTURE:
 * - Tabbed navigation
 * - Login form / Register form / Confirmation form
 * 
 * DEPENDENCIES:
 * - AuthContext, api services
 * ============================================
 */
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { X, Eye, EyeOff } from 'lucide-react';
import './AuthModal.css';

import './AuthModal.css';

const AuthModal = ({ view, onChangeView, onClose, initialEmail = '' }) => {
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

    const renderPasswordToggle = (isVisible, onToggle) => (
        <button
            type="button"
            className="input-password-toggle"
            onClick={onToggle}
            aria-label={isVisible ? 'Hide password' : 'Show password'}
        >
            {isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
    );

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
                    onClose();
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

    if (!view && !showVerificationSuccess && !showSocialConflictModal) return null;

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

    const isSuccessMessage = error === t('auth.newCodeSent');

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

    return (
        <>
            {view && (
                <div className="auth-backdrop" onClick={onClose}>
                    <div className="auth-modal" ref={dropdownRef} onClick={(e) => e.stopPropagation()}>
                        <button className="auth-modal-close" onClick={onClose} aria-label="Close">
                            <X size={20} />
                        </button>
                        {view === 'login' && (
                            <form onSubmit={handleLogin} className="auth-form">
                                <h3>{t('auth.login')}</h3>
                                <div className="auth-social-group">
                                    <button type="button" className="auth-social-btn google" onClick={() => handleSocialLogin('Google')} disabled={loading}>
                                        <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.01 24.01 0 0 0 0 21.56l7.98-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                                        {t('auth.signInWithGoogle')}
                                    </button>
                                </div>
                                <div className="auth-divider"><span>{t('auth.orWithEmail')}</span></div>
                                <Input type="email" label={t('auth.email')} value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={100} />
                                <Input
                                    type={showLoginPassword ? 'text' : 'password'}
                                    label={t('auth.password')}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    maxLength={128}
                                    leftAction={!isRTL ? renderPasswordToggle(showLoginPassword, () => setShowLoginPassword((v) => !v)) : undefined}
                                    rightAction={isRTL ? renderPasswordToggle(showLoginPassword, () => setShowLoginPassword((v) => !v)) : undefined}
                                />
                                <button
                                    type="button"
                                    onClick={() => switchAuthView('forgotPassword')}
                                    className={`forgot-password-link ${isRTL ? 'forgot-password-link-rtl' : 'forgot-password-link-ltr'}`}
                                >
                                    {t('auth.forgotPassword')}
                                </button>
                                {error && <p className="auth-error">{error}</p>}
                                <Button variant="primary" fullWidth loading={loading} type="submit">{t('auth.loginButton')}</Button>
                                <p className="auth-switch">{t('auth.noAccount')} <button type="button" onClick={() => toggleAuth('register')}>{t('auth.register')}</button></p>
                            </form>
                        )}
                        {view === 'register' && (
                            <form onSubmit={handleRegister} className="auth-form">
                                <h3>{t('auth.register')}</h3>
                                <div className="auth-social-group">
                                    <button type="button" className="auth-social-btn google" onClick={() => handleSocialLogin('Google')} disabled={loading}>
                                        <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.01 24.01 0 0 0 0 21.56l7.98-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                                        {t('auth.continueWithGoogle')}
                                    </button>
                                </div>
                                <div className="auth-divider"><span>{t('auth.orSignUpWithEmail')}</span></div>
                                <Input label={t('auth.fullName')} value={name} onChange={(e) => setName(e.target.value)} required maxLength={50} />
                                <Input type="email" label={t('auth.email')} value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={100} />
                                <Input
                                    type={showRegisterPassword ? 'text' : 'password'}
                                    label={t('auth.password')}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    maxLength={128}
                                    helperText={t('auth.passwordHint')}
                                    leftAction={!isRTL ? renderPasswordToggle(showRegisterPassword, () => setShowRegisterPassword((v) => !v)) : undefined}
                                    rightAction={isRTL ? renderPasswordToggle(showRegisterPassword, () => setShowRegisterPassword((v) => !v)) : undefined}
                                />
                                <Input
                                    type={showRegisterConfirmPassword ? 'text' : 'password'}
                                    label={t('auth.confirmPassword')}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    maxLength={128}
                                    leftAction={!isRTL ? renderPasswordToggle(showRegisterConfirmPassword, () => setShowRegisterConfirmPassword((v) => !v)) : undefined}
                                    rightAction={isRTL ? renderPasswordToggle(showRegisterConfirmPassword, () => setShowRegisterConfirmPassword((v) => !v)) : undefined}
                                />
                                
                                {error && <p className="auth-error">{error}</p>}
                                {userExistsStatus === 'EXISTS' && (
                                    <div className="auth-guidance">
                                        <Button variant="outline" fullWidth onClick={() => { switchAuthView('login'); setEmail(email); }}>{t('auth.loginButton')}</Button>
                                        <Button variant="ghost" fullWidth onClick={() => { switchAuthView('forgotPassword'); setEmail(email); }}>{t('auth.forgotPasswordShort')}</Button>
                                    </div>
                                )}
                                <Button variant="primary" fullWidth loading={loading} type="submit" disabled={userExistsStatus === 'EXISTS'}>{t('auth.registerButton')}</Button>
                                <p className="auth-switch">{t('auth.hasAccount')} <button type="button" onClick={() => toggleAuth('login')}>{t('auth.login')}</button></p>
                            </form>
                        )}
                        {view === 'confirm' && (
                            <form onSubmit={handleConfirm} className="auth-form">
                                <h3>{t('auth.confirmTitle')}</h3>
                                <p className="confirm-msg">{t('auth.confirmMessage')} <strong>{tempEmail}</strong></p>
                                <Input label={t('auth.confirmCode')} value={code} onChange={(e) => setCode(e.target.value)} required placeholder="123456" maxLength={6} />
                                {error && <p className={isSuccessMessage || error.includes('sent') ? 'auth-success' : 'auth-error'}>{error}</p>}
                                <Button variant="primary" fullWidth loading={loading} type="submit">{t('auth.confirmButton')}</Button>
                                <p className="auth-switch">{t('auth.didntReceiveCode')} <button type="button" onClick={handleResendCode} disabled={loading}>{t('auth.resendCode')}</button></p>
                                <p className="auth-switch">{t('auth.wrongEmail')} <button type="button" onClick={clearPendingVerification} disabled={loading}>{t('auth.registerAgain')}</button></p>
                            </form>
                        )}
                        {view === 'forgotPassword' && (
                            <form onSubmit={handleForgotPassword} className="auth-form">
                                <h3>{t('auth.forgotPasswordTitle')}</h3>
                                <p className="confirm-msg">{t('auth.forgotPasswordMessage')}</p>
                                <Input type="email" label={t('auth.email')} value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={100} />
                                {error && <p className="auth-error">{error}</p>}
                                <Button variant="primary" fullWidth loading={loading} type="submit">{t('auth.sendCodeButton')}</Button>
                                <p className="auth-switch"><button type="button" onClick={() => switchAuthView('login')}>{t('auth.backToLogin')}</button></p>
                            </form>
                        )}
                        {view === 'resetPassword' && (
                            <form onSubmit={handleResetPassword} className="auth-form">
                                <h3>{t('auth.resetPasswordTitle')}</h3>
                                <p className="confirm-msg">{t('auth.resetPasswordMessage')} <strong>{tempEmail}</strong></p>
                                <Input label={t('auth.confirmCode')} value={resetCode} onChange={(e) => setResetCode(e.target.value)} required placeholder={t('auth.resetCodePlaceholder')} maxLength={6} />
                                <Input
                                    type={showResetNewPassword ? 'text' : 'password'}
                                    label={t('auth.newPassword')}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                    maxLength={128}
                                    helperText={t('auth.passwordHint')}
                                    leftAction={!isRTL ? renderPasswordToggle(showResetNewPassword, () => setShowResetNewPassword((v) => !v)) : undefined}
                                    rightAction={isRTL ? renderPasswordToggle(showResetNewPassword, () => setShowResetNewPassword((v) => !v)) : undefined}
                                />
                                {error && <p className={isSuccessMessage || error.includes('sent') ? 'auth-success' : 'auth-error'}>{error}</p>}
                                <Button variant="primary" fullWidth loading={loading} type="submit">{t('auth.resetPasswordButton')}</Button>
                                <p className="auth-switch">{t('auth.didntReceiveCode')} <button type="button" onClick={handleResendResetCode} disabled={loading}>{t('auth.resendCode')}</button></p>
                                <p className="auth-switch"><button type="button" onClick={() => switchAuthView('login')}>{t('auth.backToLogin')}</button></p>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {showSocialConflictModal && (
                <div className="auth-backdrop" onClick={() => setShowSocialConflictModal(false)}>
                    <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="auth-modal-close" onClick={() => setShowSocialConflictModal(false)} aria-label="Close"><X size={20} /></button>
                        <div className="auth-form">
                            <h3>{t('auth.socialLoginTitle')}</h3>
                            <p className="confirm-msg auth-centered-text">
                                {t('auth.socialLoginDescription')}
                            </p>
                            <button type="button" className="auth-social-btn google" onClick={() => {
                                setShowSocialConflictModal(false);
                                switchAuthView('login');
                                handleSocialLogin('Google');
                            }} disabled={loading}>
                                <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.01 24.01 0 0 0 0 21.56l7.98-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                                {t('auth.signInWithGoogle')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showVerificationSuccess && (
                <div className="auth-backdrop">
                    <div className="auth-modal auth-modal-success" dir={isRTL ? 'rtl' : 'ltr'}>
                        <div className="auth-success-icon-wrap">
                            <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
                                <circle cx="30" cy="30" r="28" stroke="#10B981" strokeWidth="3" fill="rgba(16, 185, 129, 0.1)" />
                                <path d="M20 30L26 36L40 22" stroke="#10B981" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <h2 className="auth-success-title">
                            {t('auth.verificationSuccess')}
                        </h2>
                        <p className="auth-success-description">
                            {t('auth.verificationSuccessMessage')}
                        </p>
                        <Button variant="primary" fullWidth onClick={handleContinueToLogin}>
                            {t('auth.continueToLogin')}
                        </Button>
                    </div>
                </div>
            )}
        </>
    );
};

export default AuthModal;
