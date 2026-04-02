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
import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { pollForAnalysis, uploadFile } from '../services/api';
import { emitAppToast } from '../utils/toast';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import CameraScannerModal from '../features/scanner/components/CameraScannerModal';
import './UploadPage.css';

const UploadPage = () => {
    const { t, isRTL } = useLanguage();
    const navigate = useNavigate();
    const { isAdmin } = useAuth();
    const { scansRemaining, isUnlimited, hasSubscription, refreshSubscription } = useSubscription();
    const [file, setFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState('');
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const [uploadedContractId, setUploadedContractId] = useState('');
    const fileInputRef = useRef(null);

    const [metadata, setMetadata] = useState({
        propertyAddress: '',
        landlordName: '',
        startDate: '',
        monthlyRent: '',
    });
    const [customFileName, setCustomFileName] = useState('');
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [showScannerModal, setShowScannerModal] = useState(false);
    const [uploadVisualStatus, setUploadVisualStatus] = useState('idle');
    const uploadStartTimeRef = useRef(0);
    const actualUploadProgressRef = useRef(0);
    const progressIntervalRef = useRef(null);
    const MIN_PROGRESS_DURATION_MS = 4000;
    const COMPLETE_PERCENT_HOLD_MS = 800;
    const hasUploadEntitlement = isAdmin || hasSubscription;
    const hasScansAvailable = isAdmin || isUnlimited || scansRemaining > 0;
    const canChooseFile = hasUploadEntitlement && hasScansAvailable;
    const blockReason = !hasUploadEntitlement
        ? t('subscription.noActivePlanMessage')
        : t('subscription.noScansMessage');

    useEffect(() => {
        if (!uploadSuccess || !uploadedContractId) return;

        let cancelled = false;
        (async () => {
            try {
                const result = await pollForAnalysis(uploadedContractId, 24, 5000);
                if (cancelled) return;
                if (result) {
                    emitAppToast({
                        type: 'success',
                        title: t('notifications.analysisReadyTitle'),
                        message: t('notifications.analysisReadyMessage'),
                    });
                    navigate(`/analysis/${encodeURIComponent(uploadedContractId)}`);
                }
            } catch (e) {
                if (!cancelled) {
                    console.warn('Auto-navigate polling failed:', e);
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [uploadSuccess, uploadedContractId, navigate, t]);

    const validateFile = (file) => {
        const maxSize = 5 * 1024 * 1024; // 5MB - standard for rental contracts
        const minSize = 30 * 1024; 
        const maxFileNameLength = 100; 
        if (!file.type.includes('pdf')) {
            return t('upload.pdfOnly');
        }
        if (file.size > maxSize) {
            return t('upload.fileTooLarge');
        }
        if (file.size < minSize) {
            return t('upload.fileTooSmall');
        }
        if (file.name.length > maxFileNameLength) {
            return t('upload.fileNameTooLong');
        }
        return null;
    };

    const handleFileSelect = (selectedFile) => {
        if (!canChooseFile) {
            setError(blockReason);
            return;
        }

        setError('');
        setUploadSuccess(false);
        const validationError = validateFile(selectedFile);
        if (validationError) {
            setError(validationError);
            return;
        }
        setFile(selectedFile);
        setUploadVisualStatus('idle');
        setUploadProgress(0);
        const nameWithoutExt = selectedFile.name.replace(/\.pdf$/i, '');
        setCustomFileName(nameWithoutExt);
    };

    const handleDragEnter = (e) => {
        e.preventDefault();
        if (!canChooseFile) return;
        setIsDragging(true);
    };
    const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
    const handleDragOver = (e) => {
        e.preventDefault();
        if (!canChooseFile) return;
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (!canChooseFile) {
            setError(blockReason);
            return;
        }
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) handleFileSelect(droppedFile);
    };

    const handleInputChange = (e) => {
        if (!canChooseFile) {
            setError(blockReason);
            return;
        }
        const selectedFile = e.target.files[0];
        if (selectedFile) handleFileSelect(selectedFile);
    };

    const handleScannerComplete = (scannedPdfFile) => {
        handleFileSelect(scannedPdfFile);
        setShowScannerModal(false);
    };

    const handleUpload = async () => {
        if (!file || !termsAccepted) return;

        // Users without an active plan cannot upload contracts.
        if (!isAdmin && !hasSubscription) {
            setError(t('subscription.noActivePlanMessage'));
            return;
        }

        // Check if user has scans remaining
        if (!isAdmin && hasSubscription && !isUnlimited && scansRemaining <= 0) {
            setError(t('subscription.noScansMessage'));
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);
        setUploadVisualStatus('uploading');
        uploadStartTimeRef.current = Date.now();
        actualUploadProgressRef.current = 0;
        startProgressLoop();
        setError('');

        try {
            const result = await uploadFile(file, (progress) => {
                actualUploadProgressRef.current = Math.max(actualUploadProgressRef.current, progress);
            }, {
                propertyAddress: metadata.propertyAddress,
                landlordName: metadata.landlordName,
                customFileName: customFileName.trim() || file.name.replace(/\.pdf$/i, ''),
                termsAccepted: true,
            });

            const elapsed = Date.now() - uploadStartTimeRef.current;
            const waitForMinimumDuration = Math.max(0, MIN_PROGRESS_DURATION_MS - elapsed);
            if (waitForMinimumDuration > 0) {
                await delay(waitForMinimumDuration);
            }

            setUploadProgress(100);
            await delay(COMPLETE_PERCENT_HOLD_MS);
            setUploadVisualStatus('ready');
            await delay(250);

            await refreshSubscription();

            setUploadedContractId(result.contractId || '');
            setUploadSuccess(true);
            emitAppToast({
                type: 'success',
                title: t('upload.uploadSuccessTitle'),
                message: t('upload.uploadSuccessMessage'),
            });
            setFile(null);
            setTermsAccepted(false);
            setMetadata({
                propertyAddress: '',
                landlordName: '',
                startDate: '',
                monthlyRent: '',
            });
            setUploadVisualStatus('idle');
            setUploadProgress(0);

        } catch (err) {
            console.error('Upload failed:', err);
            setError(err.message || t('upload.uploadFailed'));
            setUploadVisualStatus('idle');
            emitAppToast({
                type: 'error',
                title: t('notifications.uploadFailedTitle'),
                message: err.message || t('upload.uploadFailed'),
            });
        } finally {
            stopProgressLoop();
            setIsUploading(false);
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 בייט';
        const k = 1024;
        const sizes = ['בייט', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const openFilePicker = () => {
        if (!canChooseFile) {
            setError(blockReason);
            return;
        }
        fileInputRef.current?.click();
    };

    const removeSelectedFile = () => {
        if (isUploading) return;
        setFile(null);
        setCustomFileName('');
        setUploadVisualStatus('idle');
        setUploadProgress(0);
    };

    const normalizedDisplayName = file
        ? `${(customFileName?.trim() || file.name.replace(/\.pdf$/i, '')).replace(/\.pdf$/i, '')}.pdf`
        : '';

    const uploadItems = file ? [
        {
            id: 'selected-file',
            name: normalizedDisplayName,
            size: file.size,
            progress: isUploading || uploadVisualStatus === 'ready' ? uploadProgress : 100,
            status: uploadVisualStatus === 'ready' ? 'ready' : (isUploading ? 'uploading' : 'ready'),
        },
    ] : [];

    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const stopProgressLoop = () => {
        if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
        }
    };

    const startProgressLoop = () => {
        stopProgressLoop();
        progressIntervalRef.current = setInterval(() => {
            const elapsed = Date.now() - uploadStartTimeRef.current;
            let pacedProgress;

            if (elapsed <= 500) {
                pacedProgress = (elapsed / 500) * 50;
            } else if (elapsed <= 1200) {
                pacedProgress = 50 + ((elapsed - 500) / 700) * 40;
            } else {
                pacedProgress = 90 + ((elapsed - 1200) / 300) * 10;
            }

            pacedProgress = Math.min(100, pacedProgress);
            const actualProgress = Math.min(actualUploadProgressRef.current, 100);

            setUploadProgress((prev) => {
                const pacedStep = Math.max(prev, pacedProgress);
                const next = Math.min(pacedStep, actualProgress);
                return Number.isFinite(next) ? next : prev;
            });
        }, 50);
    };

    useEffect(() => {
        return () => {
            stopProgressLoop();
        };
    }, []);

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

                {uploadSuccess && (
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
                )}

                {!uploadSuccess && (
                    <div className="upload-modern-shell animate-slideUp">
                        <div className="upload-modern-card">
                            <section className="upload-modern-dropzone-wrap">
                                <div
                                    className={`upload-modern-dropzone ${isDragging ? 'dragging' : ''} ${!canChooseFile ? 'blocked' : ''}`}
                                    onDragEnter={handleDragEnter}
                                    onDragLeave={handleDragLeave}
                                    onDragOver={handleDragOver}
                                    onDrop={handleDrop}
                                    onClick={openFilePicker}
                                >
                                    <div className="upload-modern-icon-wrap">
                                        <span className="material-symbols-outlined upload-modern-icon">cloud_upload</span>
                                    </div>
                                    <h3>{t('upload.dragDrop')}</h3>
                                    <p>{t('upload.maxSize')}</p>
                                    {!canChooseFile && <p className="drop-locked-note">{blockReason}</p>}
                                </div>
                            </section>

                            <section className="upload-modern-action-grid">
                                <button
                                    type="button"
                                    className="upload-modern-action-btn upload"
                                    onClick={openFilePicker}
                                    disabled={!canChooseFile}
                                >
                                    <span className="material-symbols-outlined">upload</span>
                                    <span>{t('upload.selectFile')}</span>
                                </button>
                                <button
                                    type="button"
                                    className="upload-modern-action-btn scan"
                                    onClick={() => {
                                        if (!canChooseFile) {
                                            setError(blockReason);
                                            return;
                                        }
                                        setShowScannerModal(true);
                                    }}
                                    disabled={!canChooseFile}
                                >
                                    <span className="material-symbols-outlined">photo_camera</span>
                                    <span>{isRTL ? 'סריקה באמצעות מצלמה' : 'Scan With Camera'}</span>
                                </button>
                            </section>

                            <AnimatePresence>
                                {uploadItems.length > 0 && (
                                <motion.section
                                    className="upload-modern-files-section"
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0, transition: { duration: 0.4, ease: 'easeInOut' } }}
                                >
                                    <h4>
                                        <span className="material-symbols-outlined">inventory_2</span>
                                        <span>{isRTL ? 'קבצים שנבחרו' : 'Selected Files'}</span>
                                    </h4>

                                    <div className="upload-modern-file-list">
                                            {uploadItems.map((item) => (
                                            <motion.div
                                                key={item.id}
                                                className="upload-modern-file-item"
                                                initial={{ opacity: 0, y: -20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.4, ease: 'easeInOut' } }}
                                            >
                                                <div className="upload-modern-file-icon-wrap">
                                                    <span className="material-symbols-outlined">picture_as_pdf</span>
                                                </div>
                                                <div className="upload-modern-file-main">
                                                    <div className="upload-modern-file-row">
                                                        <span className="upload-modern-file-name" dir="ltr">{item.name}</span>
                                                        <span className="upload-modern-file-size">{formatFileSize(item.size)}</span>
                                                    </div>

                                                    <div className="upload-modern-progress-track">
                                                        <div className={`upload-modern-progress-fill ${item.status === 'uploading' ? 'uploading' : ''}`} style={{ width: `${item.progress}%` }}></div>
                                                    </div>

                                                    <div className="upload-modern-file-row status-row">
                                                        {item.status === 'uploading' ? (
                                                            <span className="upload-modern-status uploading">
                                                                <span className="material-symbols-outlined">sync</span>
                                                                <span>{isRTL ? 'מעלה...' : 'Uploading...'} {Math.round(item.progress)}%</span>
                                                            </span>
                                                        ) : (
                                                            <span className="upload-modern-status ready">
                                                                <span className="material-symbols-outlined">check_circle</span>
                                                                <span>{isRTL ? 'מוכן לניתוח' : 'Ready for Analysis'}</span>
                                                            </span>
                                                        )}

                                                        <button
                                                            type="button"
                                                            className="upload-modern-delete-btn"
                                                            onClick={removeSelectedFile}
                                                            disabled={isUploading}
                                                            aria-label={isRTL ? 'מחיקת קובץ' : 'Delete file'}
                                                        >
                                                            <span className="material-symbols-outlined">delete</span>
                                                        </button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </motion.section>
                            )}
                            </AnimatePresence>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf"
                                onChange={handleInputChange}
                                style={{ display: 'none' }}
                            />
                        </div>

                        {error && <div className="error-message animate-slideUp">{error}</div>}

                        {file && !isUploading && (
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
                        )}

                        {file && !isUploading && (
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
                        )}

                        {file && !isUploading && (
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
                        )}
                    </div>
                )}
            </div>

            {/* Terms Modal - rendered via Portal for full screen overlay */}
            {showTermsModal && ReactDOM.createPortal(
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
            )}

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
