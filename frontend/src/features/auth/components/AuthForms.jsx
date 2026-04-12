import React from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { X, Eye, EyeOff } from 'lucide-react';

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

const GoogleIcon = () => (
    <svg width="20" height="20" viewBox="0 0 48 48">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
        <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.01 24.01 0 0 0 0 21.56l7.98-6.19z"/>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
);

export const LoginForm = ({ state }) => {
    const {
        email, setEmail, password, setPassword, error, loading,
        showLoginPassword, setShowLoginPassword, handleLogin,
        handleSocialLogin, switchAuthView, toggleAuth, t, isRTL
    } = state;

    return (
        <form onSubmit={handleLogin} className="auth-form">
            <h3>{t('auth.login')}</h3>
            <div className="auth-social-group">
                <button type="button" className="auth-social-btn google" onClick={() => handleSocialLogin('Google')} disabled={loading}>
                    <GoogleIcon />
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
    );
};

export const RegisterForm = ({ state }) => {
    const {
        email, setEmail, password, setPassword, confirmPassword, setConfirmPassword,
        name, setName, error, loading, userExistsStatus,
        showRegisterPassword, setShowRegisterPassword,
        showRegisterConfirmPassword, setShowRegisterConfirmPassword,
        handleRegister, handleSocialLogin, switchAuthView, toggleAuth, t, isRTL
    } = state;

    return (
        <form onSubmit={handleRegister} className="auth-form">
            <h3>{t('auth.register')}</h3>
            <div className="auth-social-group">
                <button type="button" className="auth-social-btn google" onClick={() => handleSocialLogin('Google')} disabled={loading}>
                    <GoogleIcon />
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
    );
};

export const ConfirmForm = ({ state }) => {
    const { code, setCode, tempEmail, error, loading, isSuccessMessage, handleConfirm, handleResendCode, clearPendingVerification, t } = state;
    return (
        <form onSubmit={handleConfirm} className="auth-form">
            <h3>{t('auth.confirmTitle')}</h3>
            <p className="confirm-msg">{t('auth.confirmMessage')} <strong>{tempEmail}</strong></p>
            <Input label={t('auth.confirmCode')} value={code} onChange={(e) => setCode(e.target.value)} required placeholder="123456" maxLength={6} />
            {error && <p className={isSuccessMessage || error.includes('sent') ? 'auth-success' : 'auth-error'}>{error}</p>}
            <Button variant="primary" fullWidth loading={loading} type="submit">{t('auth.confirmButton')}</Button>
            <p className="auth-switch">{t('auth.didntReceiveCode')} <button type="button" onClick={handleResendCode} disabled={loading}>{t('auth.resendCode')}</button></p>
            <p className="auth-switch">{t('auth.wrongEmail')} <button type="button" onClick={clearPendingVerification} disabled={loading}>{t('auth.registerAgain')}</button></p>
        </form>
    );
};

export const ForgotPasswordForm = ({ state }) => {
    const { email, setEmail, error, loading, handleForgotPassword, switchAuthView, t } = state;
    return (
        <form onSubmit={handleForgotPassword} className="auth-form">
            <h3>{t('auth.forgotPasswordTitle')}</h3>
            <p className="confirm-msg">{t('auth.forgotPasswordMessage')}</p>
            <Input type="email" label={t('auth.email')} value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={100} />
            {error && <p className="auth-error">{error}</p>}
            <Button variant="primary" fullWidth loading={loading} type="submit">{t('auth.sendCodeButton')}</Button>
            <p className="auth-switch"><button type="button" onClick={() => switchAuthView('login')}>{t('auth.backToLogin')}</button></p>
        </form>
    );
};

export const ResetPasswordForm = ({ state }) => {
    const {
        resetCode, setResetCode, newPassword, setNewPassword, tempEmail, error, loading,
        showResetNewPassword, setShowResetNewPassword, handleResetPassword,
        handleResendResetCode, switchAuthView, isSuccessMessage, t, isRTL
    } = state;
    return (
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
    );
};

export const SocialConflictModal = ({ state }) => {
    const { setShowSocialConflictModal, switchAuthView, handleSocialLogin, loading, t } = state;
    return (
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
                        <GoogleIcon />
                        {t('auth.signInWithGoogle')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export const VerificationSuccessModal = ({ state }) => {
    const { handleContinueToLogin, t, isRTL } = state;
    return (
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
    );
};
