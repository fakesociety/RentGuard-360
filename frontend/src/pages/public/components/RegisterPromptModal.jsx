import React from 'react';
import { X, Shield } from 'lucide-react';

const RegisterPromptModal = ({ isOpen, onClose, onRegister, isRTL }) => {
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
                <h3>{isRTL ? 'הרשמה נדרשת' : 'Registration Required'}</h3>
                <p>
                    {isRTL
                        ? 'כדי להעלות ולנתח חוזים, יש להירשם לאתר בחינם.'
                        : 'To upload and analyze contracts, please register for free.'}
                </p>
                <button className="cta-btn large" onClick={onRegister}>
                    {isRTL ? 'הרשמה חינם' : 'Register Free'}
                </button>
                <p className="modal-note">
                    {isRTL ? 'ללא צורך בכרטיס אשראי' : 'No credit card required'}
                </p>
            </div>
        </div>
    );
};

export default RegisterPromptModal;
