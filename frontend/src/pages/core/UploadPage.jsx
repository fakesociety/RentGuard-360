/**
 * ============================================
 *  UploadPage
 *  Contract Upload Flow
 * ============================================
 * 
 * STRUCTURE:
 * - Drop zone for drag-and-drop PDF upload
 * - File validation (size, type, name length)
 * - Metadata form (property, landlord, custom name)
 * - Progress bar during upload
 * - Terms acceptance modal
 * - Success toast + auto-redirect to analysis
 * 
 * DEPENDENCIES:
 * - api.js: uploadFile
 * - Card, Button, Input components
 * 
 * ============================================
 */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import CameraScannerModal from '../../features/scanner/components/CameraScannerModal';
import { useUpload } from '../../hooks/useUpload';

// Extracted Components
import UploadDropzone from './components/UploadDropzone';
import UploadMetadataForm from './components/UploadMetadataForm';
import UploadSuccessCard from './components/UploadSuccessCard';
import TermsModal from './components/TermsModal';

import './UploadPage.css';

const UploadPage = () => {
    const { t, isRTL } = useLanguage();
    const navigate = useNavigate();
    
    const {
        file,
        isDragging,
        isUploading,
        uploadProgress,
        error,
        uploadSuccess,
        setUploadSuccess,
        metadata,
        setMetadata,
        customFileName,
        termsAccepted,
        setTermsAccepted,
        showTermsModal,
        setShowTermsModal,
        showScannerModal,
        setShowScannerModal,
        uploadVisualStatus,
        fileInputRef,
        hasUploadEntitlement,
        hasScansAvailable,
        canChooseFile,
        blockReason,
        handleDragEnter,
        handleDragLeave,
        handleDragOver,
        handleDrop,
        handleInputChange,
        handleScannerComplete,
        handleUpload,
        openFilePicker,
        removeSelectedFile,
        isAdmin,
        hasSubscription,
        isUnlimited,
        scansRemaining
    } = useUpload();

    return (
        <div className="upload-page page-container" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="upload-container">
                <div className="upload-header animate-fadeIn">
                    <h1>{t('upload.title')}</h1>
                    <p>{t('upload.subtitle')}</p>

                    {/* No active plan warning */}
                    {!isAdmin && !hasSubscription && (
                        <Card variant="glass" padding="md" className="no-scans-banner animate-slideUp">
                            <div className="no-scans-banner-content">
                                <div className="no-scans-banner-copy">
                                    <h3>{t('subscription.noActivePlan')}</h3>
                                    <p>{t('subscription.noActivePlanMessage')}</p>
                                </div>
                                <Button variant="primary" className="no-scans-banner-cta" onClick={() => navigate('/pricing')}>
                                    {t('subscription.choosePlan')}
                                </Button>
                            </div>
                        </Card>
                    )}

                    {/* No scans warning */}
                    {!isAdmin && hasSubscription && !isUnlimited && scansRemaining <= 0 && (
                        <Card variant="glass" padding="md" className="no-scans-banner animate-slideUp">
                            <div className="no-scans-banner-content">
                                <div className="no-scans-banner-copy">
                                    <h3>{t('subscription.noScansLeft')}</h3>
                                    <p>{t('subscription.noScansMessage')}</p>
                                </div>
                                <Button variant="primary" className="no-scans-banner-cta" onClick={() => navigate('/pricing')}>
                                    {t('subscription.upgradePlan')}
                                </Button>
                            </div>
                        </Card>
                    )}
                </div>

                <UploadSuccessCard 
                    uploadSuccess={uploadSuccess} 
                    setUploadSuccess={setUploadSuccess} 
                />

                {!uploadSuccess && (
                    <div className="upload-modern-shell animate-slideUp">
                        <UploadDropzone
                            file={file}
                            isDragging={isDragging}
                            canChooseFile={canChooseFile}
                            handleDragEnter={handleDragEnter}
                            handleDragLeave={handleDragLeave}
                            handleDragOver={handleDragOver}
                            handleDrop={handleDrop}
                            openFilePicker={openFilePicker}
                            blockReason={blockReason}
                            setShowScannerModal={setShowScannerModal}
                            customFileName={customFileName}
                            isUploading={isUploading}
                            uploadVisualStatus={uploadVisualStatus}
                            uploadProgress={uploadProgress}
                            removeSelectedFile={removeSelectedFile}
                            fileInputRef={fileInputRef}
                            handleInputChange={handleInputChange}
                        />

                        {error && <div className="error-message animate-slideUp">{error}</div>}

                        <UploadMetadataForm
                            file={file}
                            isUploading={isUploading}
                            metadata={metadata}
                            setMetadata={setMetadata}
                            termsAccepted={termsAccepted}
                            setTermsAccepted={setTermsAccepted}
                            setShowTermsModal={setShowTermsModal}
                            handleUpload={handleUpload}
                            hasUploadEntitlement={hasUploadEntitlement}
                            hasScansAvailable={hasScansAvailable}
                        />
                    </div>
                )}
            </div>

            <TermsModal 
                showTermsModal={showTermsModal}
                setShowTermsModal={setShowTermsModal}
                setTermsAccepted={setTermsAccepted}
            />

            <CameraScannerModal
                open={showScannerModal}
                onClose={() => setShowScannerModal(false)}
                onComplete={handleScannerComplete}
                initialFileName={(customFileName || 'scanned-contract').trim()}
            />
        </div>
    );
};

export default UploadPage;
