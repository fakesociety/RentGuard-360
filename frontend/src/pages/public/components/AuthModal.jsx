import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { X, CheckCircle } from 'lucide-react';

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

    const [resetCode, setResetCode] = useState('');
    const [newPassword, setNewPassword] = useState('');

    const [showVerificationSuccess, setShowVerificationSuccess] = useState(false);
    const [showSocialConflictModal, setShowSocialConflictModal] = useState(false);
    const [userExistsStatus, setUserExistsStatus] = useState(null);

    useEffect(() => {
        if (initialEmail) setEmail(initialEmail);
    }, [initialEmail]);

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
                oauthErrorDescription || oauthError || (isRTL ? 'ההתחברות החברתית בוטלה או נכשלה' : 'Social login was canceled or failed')
            );
            setError(message);
            onChangeView('login');
            setShowSocialConflictModal(false);

            const cleanUrl = `${window.location.origin}${window.location.pathname}`;
            window.history.replaceState({}, document.title, cleanUrl);
        }
    }, [isRTL, view, onChangeView]);

    if (!view && !showVerificationSuccess && !showSocialConflictModal) return null;

    const translateError = (errorMessage) => {
        if (!isRTL) return errorMessage;

        const errorTranslations = {
            'Attempt limit exceeded, please try after some time': 'חרגת ממספר הניסיונות המותר, נסה שוב מאוחר יותר',
            'Invalid verification code provided': 'קוד אימות שגוי',
            'User does not exist': 'משתמש לא קיים',
            'Incorrect username or password': 'שם משתמש או סיסמה שגויים',
            'Password did not conform with policy': 'הסיסמה לא עומדת בדרישות המערכת',
            'An account with the given email already exists': 'כתובת האימייל כבר קיימת במערכת',
            'Invalid password format': 'פורמט סיסמה לא תקין',
            'Cannot reset password for the user as there is no registered/verified email': 'לא ניתן לאפס סיסמה - אין אימייל רשום',
            'User is disabled': 'המשתמש מושבת',
            'Failed to send reset code': 'שליחת קוד איפוס נכשלה',
            'Failed to reset password': 'איפוס הסיסמה נכשל',
            'Code mismatch': 'קוד שגוי',
            'Expired code': 'הקוד פג תוקף'
        };

        if (errorTranslations[errorMessage]) return errorTranslations[errorMessage];
        for (const [english, hebrew] of Object.entries(errorTranslations)) {
            if (errorMessage.includes(english)) return hebrew;
        }
        return errorMessage;
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');

        const trimmedEmail = email.trim().toLowerCase();
        const trimmedPassword = password.trim();

        if (!trimmedEmail || !trimmedPassword) {
            setError(isRTL ? 'יש למלא את כל השדות' : 'Please fill in all fields');
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
            setError(translateError(result?.error || (isRTL ? 'ההתחברות נכשלה' : 'Social login failed')));
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
            setError(isRTL ? 'כדי להירשם, התנתק קודם מהחשבון הנוכחי' : 'To register, please log out from the current account first');
            return;
        }

        const trimmedName = name.trim();
        const trimmedEmail = email.trim().toLowerCase();

        if (!trimmedName || !trimmedEmail || !password) {
            setError(isRTL ? 'יש למלא את כל השדות' : 'Please fill in all fields');
            return;
        }

        if (trimmedName.length < 2 || trimmedName.length > 50) {
            setError(isRTL ? 'שם חייב להיות בין 2-50 תווים' : 'Name must be 2-50 characters');
            return;
        }

        if (password !== confirmPassword) {
            setError(isRTL ? 'הסיסמאות לא תואמות' : 'Passwords do not match');
            return;
        }

        setLoading(true);
        setUserExistsStatus(null);

        const check = await checkUserStatus(trimmedEmail);
        
        if (check.status === 'EXISTS') {
            setError(isRTL ? 'נראה שכבר יש לך חשבון!' : 'It looks like you already have an account!');
            setUserExistsStatus('EXISTS');
            setLoading(false);
            return;
        }

        if (check.status === 'NEEDS_VERIFICATION') {
            setError(isRTL ? 'החשבון קיים אך דורש אימות.' : 'Account exists but requires verification.');
            setUserExistsStatus('NEEDS_VERIFICATION');
            try { await resendCode(trimmedEmail); } catch (e) { console.error(e); }
            setTempEmail(trimmedEmail);
            localStorage.setItem('rentguard_pending_verification', trimmedEmail);
            onChangeView('confirm');
            setLoading(false);
            return;
        }

        if (check.status === 'SOCIAL_ONLY') {
            setShowSocialConflictModal(true);
            setError(isRTL ? 'האימייל הזה מחובר לחשבון חברתי. יש להתחבר דרך Google או Facebook.' : 'This email is linked to a social account. Please sign in with Google or Facebook.');
            setLoading(false);
            return;
        }

        const result = await register(trimmedEmail, password, trimmedName);
        if (result.success) {
            setTempEmail(trimmedEmail);
            localStorage.setItem('rentguard_pending_verification', trimmedEmail);
            onChangeView('confirm');
        } else {
            if (isSocialProviderConflictError(result.error)) {
                setShowSocialConflictModal(true);
                setError(isRTL ? 'האימייל הזה מחובר לחשבון חברתי. יש להתחבר דרך Google או Facebook.' : 'This email is linked to a social account. Please sign in with Google or Facebook.');
                setLoading(false);
                return;
            }

            let errorMsg = result.error;
            if (isRTL) {
                if (errorMsg.includes('Password')) errorMsg = 'הסיסמה חייבת לכלול לפחות 8 תווים, אות גדולה, אות קטנה ומספר';
                else if (errorMsg.includes('email')) errorMsg = 'כתובת אימייל לא תקינה';
                else if (errorMsg.includes('already exists')) errorMsg = 'המשתמש כבר קיים במערכת';
                else errorMsg = 'ההרשמה נכשלה. נסה שוב.';
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
            onChangeView(null);
            setShowVerificationSuccess(true);
        } else {
            let errorMsg = result.error;
            if (isRTL) {
                if (errorMsg.includes('Invalid') || errorMsg.includes('code')) errorMsg = 'קוד אימות שגוי';
                else if (errorMsg.includes('expired')) errorMsg = 'הקוד פג תוקף. לחץ על שלח קוד חדש';
                else errorMsg = 'האימות נכשל. נסה שוב.';
            }
            setError(errorMsg);
            setLoading(false);
        }
    };

    const handleContinueToLogin = () => {
        setShowVerificationSuccess(false);
        onChangeView('login');
        setEmail(tempEmail);
    };

    const handleResendCode = async () => {
        setError('');
        setLoading(true);
        try {
            await resendCode(tempEmail);
            setError(isRTL ? 'קוד חדש נשלח לאימייל שלך' : 'New code sent to your email');
        } catch {
            setError(isRTL ? 'שליחת הקוד נכשלה. נסה שוב.' : 'Failed to resend code. Try again.');
        }
        setLoading(false);
    };

    const clearPendingVerification = () => {
        try { localStorage.removeItem('rentguard_pending_verification'); } catch { }
        setError('');
        setCode('');
        setTempEmail('');
        onChangeView('register');
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setError('');

        const trimmedEmail = email.trim().toLowerCase();
        if (!trimmedEmail) {
            setError(isRTL ? 'יש להזין כתובת אימייל' : 'Please enter email address');
            return;
        }

        setLoading(true);
        const result = await forgotPassword(trimmedEmail);
        if (result.success) {
            setTempEmail(trimmedEmail);
            onChangeView('resetPassword');
        } else {
            setError(translateError(result.error || 'Failed to send reset code'));
        }
        setLoading(false);
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');

        if (!resetCode.trim() || !newPassword.trim()) {
            setError(isRTL ? 'יש למלא את כל השדות' : 'Please fill in all fields');
            return;
        }

        setLoading(true);
        const result = await resetUserPassword(tempEmail, resetCode, newPassword);
        if (result.success) {
            onChangeView('login');
            setEmail(tempEmail);
            setPassword('');
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
            setError(isRTL ? 'קוד חדש נשלח לאימייל שלך' : 'New code sent to your email');
        } catch {
            setError(isRTL ? 'שליחת הקוד נכשלה. נסה שוב.' : 'Failed to resend code. Try again.');
        }
        setLoading(false);
    };

    const toggleAuth = (type) => {
        const pendingEmail = localStorage.getItem('rentguard_pending_verification');
        if (type === 'register' && pendingEmail) {
            setTempEmail(String(pendingEmail || '').trim().toLowerCase());
            setError('');
            onChangeView('confirm');
            return;
        }
        setError('');
        onChangeView(view === type ? null : type);
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
                                        {isRTL ? 'התחברות עם Google' : 'Sign in with Google'}
                                    </button>
                                    <button type="button" className="auth-social-btn facebook" onClick={() => handleSocialLogin('Facebook')} disabled={loading}>
                                        <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#1877F2" d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24c0 11.979 8.776 21.908 20.25 23.708v-16.77h-6.094V24h6.094v-5.288c0-6.014 3.583-9.337 9.065-9.337 2.625 0 5.372.469 5.372.469v5.906h-3.026c-2.981 0-3.911 1.85-3.911 3.75V24h6.656l-1.064 6.938H27.75v16.77C39.224 45.908 48 35.978 48 24z"/></svg>
                                        {isRTL ? 'התחברות עם Facebook' : 'Sign in with Facebook'}
                                    </button>
                                </div>
                                <div className="auth-divider"><span>{isRTL ? 'או עם אימייל' : 'or with email'}</span></div>
                                <Input type="email" label={t('auth.email')} value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={100} />
                                <Input type="password" label={t('auth.password')} value={password} onChange={(e) => setPassword(e.target.value)} required maxLength={128} />
                                <button type="button" onClick={() => onChangeView('forgotPassword')} className="forgot-password-link" style={{ alignSelf: isRTL ? 'flex-start' : 'flex-end', background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.9rem', marginTop: '-0.5rem', marginBottom: '0.5rem', textDecoration: 'underline' }}>
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
                                        {isRTL ? 'הרשמה עם Google' : 'Continue with Google'}
                                    </button>
                                    <button type="button" className="auth-social-btn facebook" onClick={() => handleSocialLogin('Facebook')} disabled={loading}>
                                        <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#1877F2" d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24c0 11.979 8.776 21.908 20.25 23.708v-16.77h-6.094V24h6.094v-5.288c0-6.014 3.583-9.337 9.065-9.337 2.625 0 5.372.469 5.372.469v5.906h-3.026c-2.981 0-3.911 1.85-3.911 3.75V24h6.656l-1.064 6.938H27.75v16.77C39.224 45.908 48 35.978 48 24z"/></svg>
                                        {isRTL ? 'הרשמה עם Facebook' : 'Continue with Facebook'}
                                    </button>
                                </div>
                                <div className="auth-divider"><span>{isRTL ? 'או הרשמה באימייל' : 'or sign up with email'}</span></div>
                                <Input label={t('auth.fullName')} value={name} onChange={(e) => setName(e.target.value)} required maxLength={50} />
                                <Input type="email" label={t('auth.email')} value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={100} />
                                <Input type="password" label={t('auth.password')} value={password} onChange={(e) => setPassword(e.target.value)} required maxLength={128} helperText={t('auth.passwordHint')} />
                                <Input type="password" label={isRTL ? 'אימות סיסמה' : 'Confirm Password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required maxLength={128} />
                                
                                {error && <p className="auth-error">{error}</p>}
                                {userExistsStatus === 'EXISTS' && (
                                    <div className="auth-guidance">
                                        <Button variant="outline" fullWidth onClick={() => { onChangeView('login'); setEmail(email); }}>{t('auth.loginButton')}</Button>
                                        <Button variant="ghost" fullWidth onClick={() => { onChangeView('forgotPassword'); setEmail(email); }}>{isRTL ? 'שכחתי סיסמה' : 'Forgot Password'}</Button>
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
                                {error && <p className={error.includes('נשלח') || error.includes('sent') ? 'auth-success' : 'auth-error'}>{error}</p>}
                                <Button variant="primary" fullWidth loading={loading} type="submit">{t('auth.confirmButton')}</Button>
                                <p className="auth-switch">{isRTL ? 'לא קיבלת את הקוד?' : "Didn't receive the code?"} <button type="button" onClick={handleResendCode} disabled={loading}>{isRTL ? 'שלח קוד חדש' : 'Resend Code'}</button></p>
                                <p className="auth-switch">{isRTL ? 'טעית באימייל?' : 'Wrong email?'} <button type="button" onClick={clearPendingVerification} disabled={loading}>{isRTL ? 'הירשם מחדש' : 'Register again'}</button></p>
                            </form>
                        )}
                        {view === 'forgotPassword' && (
                            <form onSubmit={handleForgotPassword} className="auth-form">
                                <h3>{t('auth.forgotPasswordTitle')}</h3>
                                <p className="confirm-msg">{t('auth.forgotPasswordMessage')}</p>
                                <Input type="email" label={t('auth.email')} value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={100} />
                                {error && <p className="auth-error">{error}</p>}
                                <Button variant="primary" fullWidth loading={loading} type="submit">{t('auth.sendCodeButton')}</Button>
                                <p className="auth-switch"><button type="button" onClick={() => toggleAuth('login')}>{t('auth.backToLogin')}</button></p>
                            </form>
                        )}
                        {view === 'resetPassword' && (
                            <form onSubmit={handleResetPassword} className="auth-form">
                                <h3>{t('auth.resetPasswordTitle')}</h3>
                                <p className="confirm-msg">{t('auth.resetPasswordMessage')} <strong>{tempEmail}</strong></p>
                                <Input label={t('auth.confirmCode')} value={resetCode} onChange={(e) => setResetCode(e.target.value)} required placeholder={t('auth.resetCodePlaceholder')} maxLength={6} />
                                <Input type="password" label={t('auth.newPassword')} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required maxLength={128} helperText={t('auth.passwordHint')} />
                                {error && <p className={error.includes('נשלח') || error.includes('sent') ? 'auth-success' : 'auth-error'}>{error}</p>}
                                <Button variant="primary" fullWidth loading={loading} type="submit">{t('auth.resetPasswordButton')}</Button>
                                <p className="auth-switch">{isRTL ? 'לא קיבלת את הקוד?' : "Didn't receive the code?"} <button type="button" onClick={handleResendResetCode} disabled={loading}>{isRTL ? 'שלח קוד חדש' : 'Resend Code'}</button></p>
                                <p className="auth-switch"><button type="button" onClick={() => toggleAuth('login')}>{t('auth.backToLogin')}</button></p>
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
                            <h3>{isRTL ? 'התחברות דרך רשת חברתית' : 'Sign in with Social Account'}</h3>
                            <p className="confirm-msg" style={{ textAlign: 'center' }}>
                                {isRTL
                                    ? 'האימייל הזה כבר מקושר להתחברות חברתית. כדי להמשיך, התחבר דרך Google (או Facebook בהמשך).'
                                    : 'This email is already linked to a social login. Continue with Google (Facebook support is coming next).'}
                            </p>
                            <button type="button" className="auth-social-btn google" onClick={() => {
                                setShowSocialConflictModal(false);
                                onChangeView('login');
                                handleSocialLogin('Google');
                            }} disabled={loading}>
                                <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.01 24.01 0 0 0 0 21.56l7.98-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                                {isRTL ? 'התחברות עם Google' : 'Sign in with Google'}
                            </button>
                            <button type="button" className="auth-social-btn facebook" onClick={() => {
                                setShowSocialConflictModal(false);
                                onChangeView('login');
                                handleSocialLogin('Facebook');
                            }} disabled={loading}>
                                <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#1877F2" d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24c0 11.979 8.776 21.908 20.25 23.708v-16.77h-6.094V24h6.094v-5.288c0-6.014 3.583-9.337 9.065-9.337 2.625 0 5.372.469 5.372.469v5.906h-3.026c-2.981 0-3.911 1.85-3.911 3.75V24h6.656l-1.064 6.938H27.75v16.77C39.224 45.908 48 35.978 48 24z"/></svg>
                                {isRTL ? 'התחברות עם Facebook' : 'Sign in with Facebook'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showVerificationSuccess && (
                <div className="auth-backdrop">
                    <div className="auth-modal" dir={isRTL ? 'rtl' : 'ltr'} style={{ textAlign: 'center', maxWidth: '420px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                            <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
                                <circle cx="30" cy="30" r="28" stroke="#10B981" strokeWidth="3" fill="rgba(16, 185, 129, 0.1)" />
                                <path d="M20 30L26 36L40 22" stroke="#10B981" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <h2 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 'var(--font-weight-bold)', color: 'var(--text-primary)', marginBottom: '1rem' }}>
                            {t('auth.verificationSuccess')}
                        </h2>
                        <p style={{ fontSize: 'var(--font-size-md)', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '1.5rem' }}>
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
