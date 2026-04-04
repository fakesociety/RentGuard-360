import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext/LanguageContext';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import { useNavigate } from 'react-router-dom';

const UploadSuccessCard = ({ uploadSuccess, setUploadSuccess }) => {
    const { t, isRTL } = useLanguage();
    const navigate = useNavigate();

    if (!uploadSuccess) return null;

    return (
        <Card variant="glass" padding="md" className="success-card animate-slideUp">
            <div className="success-content">
                <span className="success-icon">✅</span>
                <div>
                    <h3>{t('upload.uploadSuccess')}</h3>
                    <p className="analyzing-status">
                        <span className="mini-spinner"></span>
                        {t('upload.analyzing')}
                    </p>
                    <p className="upload-confirm">{t('upload.uploadedToServer')}</p>
                    <p className="upload-confirm">{t('upload.analysisStarted')}</p>
                </div>
            </div>
            <div className="success-actions">
                <Button variant="primary" onClick={() => navigate('/contracts')}>
                    {t('upload.viewMyContracts')} {isRTL ? '←' : '→'}
                </Button>
                <Button variant="secondary" onClick={() => setUploadSuccess(false)}>
                    {t('upload.uploadAnother')}
                </Button>
            </div>
        </Card>
    );
};

export default UploadSuccessCard;