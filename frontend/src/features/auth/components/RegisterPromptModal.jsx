/**
 * ============================================
 *  RegisterPromptModal Component
 *  Prompt for guests trying to access premium features
 * ============================================
 * 
 * STRUCTURE:
 * - Modal overlay
 * - CTA to register
 * 
 * DEPENDENCIES:
 * - None
 * ============================================
 */
import React from 'react';
import { X, Shield } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';
import './RegisterPromptModal.css';

const RegisterPromptModal = ({ isOpen, onClose, onRegister }) => {
    const { t } = useLanguage();

    if (!isOpen) return null;
    return (
        <div className="register-prompt-backdrop" onClick={onClose}>
            <div className="register-prompt-modal" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close-btn" onClick={onClose}>
                    <X size={20} />
                </button>
                <div className="modal-icon">
                    <Shield size={48} />
                </div>
                <h3>{t('landing.registerPromptTitle')}</h3>
                <p>{t('landing.registerPromptDescription')}</p>
                <button className="landing-cta-btn landing-cta-btn-large" onClick={onRegister}>
                    {t('landing.registerPromptButton')}
                </button>
                <p className="modal-note">
                    {t('landing.registerPromptNoCard')}
                </p>
            </div>
        </div>
    );
};

export default RegisterPromptModal;
