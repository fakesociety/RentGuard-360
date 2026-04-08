import React from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, CheckSquare, LoaderCircle } from 'lucide-react';
import { useLanguage } from '../../../contexts/LanguageContext/LanguageContext';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import { useNavigate } from 'react-router-dom';

const removeLeadingCheckmark = (text) => String(text || '').replace(/^[✓✔]\s*/, '');

const UploadSuccessCard = ({ uploadSuccess, setUploadSuccess }) => {
    const { t, isRTL } = useLanguage();
    const navigate = useNavigate();

    if (!uploadSuccess) return null;

    return (
        <Card variant="glass" padding="md" className="success-card animate-slideUp">
            <div className="success-content">
                <span className="success-icon" aria-hidden="true">
                    <CheckSquare size={34} strokeWidth={2.1} />
                </span>
                <div>
                    <h3>{t('upload.uploadSuccess')}</h3>
                    <div className="success-status-stack">
                        <p className="analyzing-status">
                            <LoaderCircle size={14} strokeWidth={2.3} className="success-inline-icon spin" />
                            <span>{t('upload.analyzing')}</span>
                        </p>
                        <p className="upload-confirm">
                            <CheckCircle2 size={14} strokeWidth={2.3} className="success-inline-icon" />
                            <span>{removeLeadingCheckmark(t('upload.uploadedToServer'))}</span>
                        </p>
                        <p className="upload-confirm">
                            <CheckCircle2 size={14} strokeWidth={2.3} className="success-inline-icon" />
                            <span>{removeLeadingCheckmark(t('upload.analysisStarted'))}</span>
                        </p>
                    </div>
                </div>
            </div>
            <div className="success-actions">
                <Button variant="primary" onClick={() => navigate('/contracts')}>
                    <span>{t('upload.viewMyContracts')}</span>
                    {isRTL ? <ArrowLeft size={16} strokeWidth={2.2} /> : <ArrowRight size={16} strokeWidth={2.2} />}
                </Button>
                <Button variant="secondary" className="success-upload-another-btn" onClick={() => setUploadSuccess(false)}>
                    {t('upload.uploadAnother')}
                </Button>
            </div>
        </Card>
    );
};

export default UploadSuccessCard;