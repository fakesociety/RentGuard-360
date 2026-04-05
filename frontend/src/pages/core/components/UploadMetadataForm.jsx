import React from 'react';
import { Link } from 'react-router-dom';
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
                <div className="terms-checkbox" role="group" aria-labelledby="terms-text">
                    <label htmlFor="upload-terms-checkbox" className="sr-only">
                        {t('upload.termsLabel')}
                    </label>
                    <input
                        id="upload-terms-checkbox"
                        type="checkbox"
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                    />
                    <span id="terms-text" className="terms-text">
                        {t('upload.termsLabel')}
                        <Link to="/terms" className="terms-link">
                            {t('upload.termsLinkTerms')}
                        </Link>
                        {t('upload.termsLinkAnd')}
                        <Link to="/privacy" className="terms-link">
                            {t('upload.termsLinkPrivacy')}
                        </Link>
                    </span>
                </div>
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