import React from 'react';
import ReactDOM from 'react-dom';
import { useLanguage } from '../../../contexts/LanguageContext/LanguageContext';
import Button from '../../../components/ui/Button';

const TermsModal = ({
    showTermsModal,
    setShowTermsModal,
    setTermsAccepted
}) => {
    const { t } = useLanguage();

    if (!showTermsModal) return null;

    return ReactDOM.createPortal(
        <div className="terms-modal-overlay" onClick={() => setShowTermsModal(false)}>
            <div className="terms-modal" onClick={(e) => e.stopPropagation()}>
                <div className="terms-modal-header">
                    <h2>{t('upload.termsTitle')}</h2>
                    <button className="terms-modal-close" onClick={() => setShowTermsModal(false)}>✕</button>
                </div>
                <div className="terms-modal-content">
                    <h3>{t('upload.terms1Title')}</h3>
                    <p>{t('upload.terms1Content')}</p>

                    <h3>{t('upload.terms2Title')}</h3>
                    <p>{t('upload.terms2Content')}</p>

                    <h3>{t('upload.terms3Title')}</h3>
                    <p>{t('upload.terms3Content')}</p>

                    <h3>{t('upload.terms4Title')}</h3>
                    <p>{t('upload.terms4Content')}</p>

                    <h3>{t('upload.terms5Title')}</h3>
                    <p>{t('upload.terms5Content')}</p>

                    <h3>{t('upload.terms6Title')}</h3>
                    <p>{t('upload.terms6Content')}</p>
                </div>
                <div className="terms-modal-footer">
                    <Button
                        variant="primary"
                        onClick={() => {
                            setTermsAccepted(true);
                            setShowTermsModal(false);
                        }}
                    >
                        {t('upload.iAgree')}
                    </Button>
                    <Button variant="secondary" onClick={() => setShowTermsModal(false)}>
                        {t('upload.close')}
                    </Button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default TermsModal;