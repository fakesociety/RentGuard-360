import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { pollForAnalysis, uploadFile } from '../services/api';
import { emitAppToast } from '../utils/toast';

export const useUpload = () => {
    const { t } = useLanguage();
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

    const validateFile = (file) => {
        const maxSize = 5 * 1024 * 1024;
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
    
    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };
    
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

    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const handleUpload = async () => {
        if (!file || !termsAccepted) return;

        if (!isAdmin && !hasSubscription) {
            setError(t('subscription.noActivePlanMessage'));
            return;
        }

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

    return {
        file,
        setFile,
        isDragging,
        isUploading,
        uploadProgress,
        error,
        uploadSuccess,
        setUploadSuccess,
        metadata,
        setMetadata,
        customFileName,
        setCustomFileName,
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
    };
};