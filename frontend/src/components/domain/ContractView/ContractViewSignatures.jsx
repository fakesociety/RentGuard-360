import React from 'react';

const ContractViewSignatures = ({ t }) => {
    return (
        <footer className="lf-cv-signatures-footer">
            <h3>{t('contractView.signaturesTitle')}</h3>
            <div className="lf-cv-signatures-grid">
                <div className="lf-cv-signature-block">
                    <div className="lf-cv-sig-line"></div>
                    <p className="lf-cv-sig-role">{t('contractView.landlord')}</p>
                    <p className="lf-cv-sig-placeholder">{t('contractView.namePlaceholder')}</p>
                    <p className="lf-cv-sig-placeholder">{t('contractView.idPlaceholder')}</p>
                </div>
                <div className="lf-cv-signature-block">
                    <div className="lf-cv-sig-line"></div>
                    <p className="lf-cv-sig-role">{t('contractView.tenant')}</p>
                    <p className="lf-cv-sig-placeholder">{t('contractView.namePlaceholder')}</p>
                    <p className="lf-cv-sig-placeholder">{t('contractView.idPlaceholder')}</p>
                </div>
            </div>
            <p className="lf-cv-sig-date">{t('contractView.datePlaceholder')}</p>
        </footer>
    );
};

export default ContractViewSignatures;
