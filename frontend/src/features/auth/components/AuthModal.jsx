/**
 * ============================================
 *  AuthModal Component
 *  Unified authentication modal (Login/Register/Confirm)
 * ============================================
 */
import React from 'react';
import { X } from 'lucide-react';
import { useAuthFlow } from '../hooks/useAuthFlow';
import {
    LoginForm,
    RegisterForm,
    ConfirmForm,
    ForgotPasswordForm,
    ResetPasswordForm,
    SocialConflictModal,
    VerificationSuccessModal
} from './AuthForms';
import './AuthModal.css';

const AuthModal = (props) => {
    const { view, onClose } = props;
    const authState = useAuthFlow(props);
    const {
        showVerificationSuccess,
        showSocialConflictModal,
        dropdownRef,
    } = authState;

    if (!view && !showVerificationSuccess && !showSocialConflictModal) return null;

    return (
        <>
            {view && (
                <div className="auth-backdrop" onClick={onClose}>
                    <div className="auth-modal" ref={dropdownRef} onClick={(e) => e.stopPropagation()}>
                        <button className="auth-modal-close" onClick={onClose} aria-label="Close">
                            <X size={20} />
                        </button>
                        
                        {view === 'login' && <LoginForm state={authState} />}
                        {view === 'register' && <RegisterForm state={authState} />}
                        {view === 'confirm' && <ConfirmForm state={authState} />}
                        {view === 'forgotPassword' && <ForgotPasswordForm state={authState} />}
                        {view === 'resetPassword' && <ResetPasswordForm state={authState} />}
                    </div>
                </div>
            )}

            {showSocialConflictModal && <SocialConflictModal state={authState} />}
            {showVerificationSuccess && <VerificationSuccessModal state={authState} />}
        </>
    );
};

export default AuthModal;
