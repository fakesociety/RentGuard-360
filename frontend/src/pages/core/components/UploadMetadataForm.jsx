import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext/LanguageContext';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';

const UploadMetadataForm = ({
    file,
    isUploading,
    metadata,
    setMetadata,
    termsAccepted,
    setTermsAccepted,
    setShowTermsModal,
    handleUpload,
    hasUploadEntitlement,
    hasScansAvailable,
}) => {
    const { t } = useLanguage();

    if (!file || isUploading) return null;

    return (
        <>
            <Card variant="elevated" padding="lg" className="metadata-card animate-slideUp">
                <h3>{t('upload.contractDetails')}</h3>
                <div className="metadata-grid">
                    <Input
                        label={t('upload.propertyAddress')}
                        placeholder={t('upload.addressPlaceholder')}
                        value={metadata.propertyAddress}
                        onChange={(e) => setMetadata({ ...metadata, propertyAddress: e.target.value })}
                    />
                    <Input
                        label={t('upload.landlordName')}
                        placeholder={t('upload.landlordPlaceholder')}
                        value={metadata.landlordName}
                        onChange={(e) => setMetadata({ ...metadata, landlordName: e.target.value })}
                    />
                </div>
            </Card>

            <div className="terms-section animate-slideUp">
                <label className="terms-checkbox">
                    <input
                        type="checkbox"
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                    />
                    <span className="terms-text">
                        {t('upload.termsLabel')}{' '}
                        <button
                            type="button"
                            className="terms-link"
                            onClick={() => setShowTermsModal(true)}
                        >
                            {t('upload.termsLink')}
                        </button>
                    </span>
                </label>
            </div>

            <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={handleUpload}
                className="upload-button animate-slideUp"
                disabled={!termsAccepted || !hasUploadEntitlement || !hasScansAvailable}
            >
                {t('upload.uploadBtn')}
            </Button>
        </>
    );
};

export default UploadMetadataForm;