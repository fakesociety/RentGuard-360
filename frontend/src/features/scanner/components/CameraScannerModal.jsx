/**
 * ============================================
 *  CameraScannerModal Component
 *  Mobile/Webcam document scanning wizard
 * ============================================
 * 
 * STRUCTURE:
 * - Webcam capture
 * - Cropping overlay (ReactCrop)
 * - ScannerThumbnailGallery for pages
 * - Build PDF on complete
 * 
 * DEPENDENCIES:
 * - react-webcam, react-image-crop
 * - useScanPages hook
 * ============================================
 */
import React, { useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import Webcam from 'react-webcam';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { useScanPages } from '@/features/scanner/hooks/useScanPages';
import { useScannerUIState } from '@/features/scanner/hooks/useScannerUIState';
import { compressCaptureDataUrl, getCroppedImg } from '@/features/scanner/services/imageProcessing';
import { buildPdfFileFromPages } from '@/features/scanner/services/pdfBuilder';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';
import ScannerThumbnailGallery from './ScannerThumbnailGallery';
import './CameraScannerModal.css';

const PDF_MAX_BYTES = 5 * 1024 * 1024;
const SCAN_ANIMATION_MS = 2500;

const formatMb = (bytes) => `${(bytes / (1024 * 1024)).toFixed(2)} MB`;

const videoConstraints = {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    facingMode: { ideal: 'environment' },
};

const CameraScannerModal = ({
    open,
    onClose,
    onComplete,
    initialFileName = 'scanned-contract',
}) => {
    const { t, isRTL } = useLanguage();
    const webcamRef = useRef(null);
    const pendingImageRef = useRef(null);
    const scanTimerRef = useRef(null);
    const {
        isCapturing,
        isBuildingPdf,
        pendingCapture,
        crop,
        completedCrop,
        isAutoScanning,
        expandedPageId,
        error,
        setIsCapturing,
        setIsBuildingPdf,
        setIsAutoScanning,
        setCrop,
        setCompletedCrop,
        setExpandedPageId,
        setErrorMessage,
        clearError,
        startCamera,
        stopCamera,
        enableCropMode,
        disableCropMode,
        resetUI,
    } = useScannerUIState();
    const {
        pages,
        activePageId,
        setActivePageId,
        addPage,
        removePage,
        clearPages,
    } = useScanPages();

    const expandedPage = useMemo(
        () => pages.find((item) => item.id === expandedPageId) || null,
        [expandedPageId, pages]
    );

    if (!open) {
        return null;
    }

    const clearScanTimer = () => {
        if (scanTimerRef.current) {
            clearTimeout(scanTimerRef.current);
            scanTimerRef.current = null;
        }
    };

    const handleRetake = () => {
        clearScanTimer();
        disableCropMode();
    };

    const handleClose = () => {
        clearScanTimer();
        stopCamera();
        resetUI();
        clearPages();
        onClose();
    };

    /**
     * Captures a single frame from the live camera stream and transitions the UI
     * into crop mode only after a valid frame exists.
     * This prevents downstream crop/processing steps from running on empty input.
     */
    const handleCapture = async () => {
        clearError();

        const frameDataUrl = webcamRef.current?.getScreenshot();
        if (!frameDataUrl) {
            setErrorMessage('Camera frame is not available yet. Please allow camera access and retry.');
            return;
        }

        clearScanTimer();
        enableCropMode(frameDataUrl);
    };

    const handlePendingImageLoad = (event) => {
        const image = event.currentTarget;

        // Render a usable crop box immediately so UI controls never wait on async detection.
        const fallbackCrop = {
            unit: 'px',
            x: 0,
            y: 0,
            width: image.width,
            height: image.height,
        };

        setCrop(fallbackCrop);
        setCompletedCrop(fallbackCrop);

        if (!pendingCapture) {
            setIsAutoScanning(false);
        }
    };

    /**
     * Applies the selected crop using source-image coordinates, then runs the
     * processing pipeline while enforcing a minimum animation time for stable UX feedback.
     */
    const handleApplyCrop = async () => {
        if (!pendingCapture || !completedCrop || !pendingImageRef.current) {
            setErrorMessage('Adjust the crop area before confirming.');
            return;
        }

        setIsCapturing(true);
        setIsAutoScanning(true);
        try {
            const displayImage = pendingImageRef.current;
            const scaleX = displayImage.naturalWidth / displayImage.width;
            const scaleY = displayImage.naturalHeight / displayImage.height;

            const naturalCrop = {
                x: completedCrop.x * scaleX,
                y: completedCrop.y * scaleY,
                width: completedCrop.width * scaleX,
                height: completedCrop.height * scaleY,
            };

            // Keep scan animation visible long enough for user feedback, even on fast devices.
            const minimumScanDelay = new Promise((resolve) => {
                clearScanTimer();
                scanTimerRef.current = setTimeout(resolve, SCAN_ANIMATION_MS);
            });

            const processPromise = getCroppedImg(pendingCapture, naturalCrop);
            const [croppedDataUrl] = await Promise.all([processPromise, minimumScanDelay]);
            const page = await compressCaptureDataUrl(croppedDataUrl, {
                maxWidth: 1600,
                quality: 0.84,
            });
            addPage(page);
            disableCropMode();
        } catch (captureError) {
            setErrorMessage(captureError.message || 'Failed to capture page.');
        } finally {
            clearScanTimer();
            setIsAutoScanning(false);
            setIsCapturing(false);
        }
    };

    /**
     * Builds a PDF from scanned pages and blocks completion when file size would
     * exceed upload constraints, so users can correct the scan before leaving the modal.
     */
    const handleCreatePdf = async () => {
        if (!pages.length) {
            setErrorMessage('Capture at least one page before creating the PDF.');
            return;
        }

        clearError();
        setIsBuildingPdf(true);

        try {
            const baseName = (initialFileName || 'scanned-contract').replace(/\.pdf$/i, '').trim() || 'scanned-contract';
            const pdfFile = await buildPdfFileFromPages(pages, {
                fileName: `${baseName}.pdf`,
                marginMm: 8,
            });

            // Guardrail for the backend upload limit to prevent a failed upload after scanning.
            if (pdfFile.size > PDF_MAX_BYTES) {
                setErrorMessage(
                    `Generated PDF is ${formatMb(pdfFile.size)} and exceeds the 5 MB upload limit. Remove a page and try again.`
                );
                return;
            }

            onComplete(pdfFile);
            handleClose();
        } catch (buildError) {
            setErrorMessage(buildError.message || 'Failed to generate PDF from scanned pages.');
        } finally {
            setIsBuildingPdf(false);
        }
    };

    return ReactDOM.createPortal(
        <div className="scanner-modal-overlay">
            <div className="scanner-modal" onClick={(e) => e.stopPropagation()}>

                {/* ========================================================= */}
                {/* === 1. HEADER SECTION === */}
                {/* ========================================================= */}
                <div className="scanner-modal-header">
                    <button type="button" className="scanner-close" onClick={handleClose}>✕</button>
                </div>

                {/* ========================================================= */}
                {/* === 2. MAIN BODY === */}
                {/* ========================================================= */}
                <div className="scanner-modal-body">

                    {/* ========================================================= */}
                    {/* === 2.1 CAMERA LAYER === */}
                    {/* ========================================================= */}
                    <div className="scanner-camera-panel">
                        <Webcam
                            ref={webcamRef}
                            audio={false}
                            screenshotFormat="image/jpeg"
                            screenshotQuality={1}
                            videoConstraints={videoConstraints}
                            className="scanner-webcam"
                            mirrored={false}
                            forceScreenshotSourceSize={true}
                            playsInline={true}
                            onUserMedia={() => {
                                startCamera();
                            }}
                            onUserMediaError={(err) => {
                                const errMsg = err.message || err.name || '';
                                if (err.name === 'NotAllowedError' || err.name === 'NotFoundError') {
                                    setErrorMessage(t('upload.cameraAccessError'));
                                } else if (errMsg.includes('getUserMedia is not implemented')) {
                                    setErrorMessage(t('upload.cameraNotSupportedError') || 'המצלמה אינה נתמכת בדפדפן זה הקפד לגלוש בחיבור מאובטח (HTTPS) או לפתוח את האתר בדפדפן הראשי (Chrome/Safari).');
                                } else {
                                    setErrorMessage(`${t('upload.cameraErrorPrefix')} ${errMsg || 'Unknown'}`);
                                }
                                stopCamera();
                            }}
                        />

                        {/* ========================================================= */}
                        {/* === 2.2 CAMERA ERROR OVERLAY === */}
                        {/* ========================================================= */}
                        {error && (
                            <div className="scanner-error-overlay" style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
                                <span className="scanner-error-icon">📷</span>
                                <h3 className="scanner-error-title">{t('upload.cameraBlockedTitle')}</h3>
                                <p className="scanner-error-message">
                                    {error}
                                </p>
                                {error !== t('upload.cameraNotSupportedError') && (
                                    <p className="scanner-error-hints">
                                        {t('upload.cameraBlockedDesc1')}<br/>
                                        {t('upload.cameraBlockedDesc2')}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ========================================================= */}
                    {/* === 2.3 SPOTLIGHT OVERLAY LAYER === */}
                    {/* ========================================================= */}
                    <div className="scanner-spotlight-overlay">
                        <div className="scanner-focus-box">
                            <div className="focus-corners-bottom"></div>
                        </div>
                        <div className="scanner-focus-guidance" dir="rtl">
                            {t('scanner.focus_guidance')}
                        </div>
                    </div>

                    {/* ========================================================= */}
                    {/* === 2.4 BOTTOM CONTROLS LAYER === */}
                    {/* ========================================================= */}
                    <div className="scanner-controls-wrapper">

                        <div className="scanner-gallery-panel">
                            <ScannerThumbnailGallery
                                pages={pages}
                                activePageId={activePageId}
                                onSelect={setActivePageId}
                                onDelete={removePage}
                                onExpand={setExpandedPageId}
                            />
                        </div>

                        <div className="capture-btn-wrapper">

                            <button 
                                type="button"
                                className="shutter-button"
                                onClick={handleCapture}
                                disabled={isCapturing || isBuildingPdf || Boolean(pendingCapture)}
                            >
                                <div className="shutter-inner"></div>
                            </button>

                            <button
                                type="button"
                                className="finish-scan-btn"
                                onClick={handleCreatePdf}
                                disabled={!pages.length || isBuildingPdf || isCapturing || Boolean(pendingCapture)}
                            >
                                {isBuildingPdf ? 'Building...' : `Done (${pages.length})`}
                            </button>
                        </div>
                    </div>

                    {/* ========================================================= */}
                    {/* === 2.5 CROP OVERLAY FLOW === */}
                    {/* ========================================================= */}
                    {pendingCapture && (
                        <div className="scanner-crop-overlay">
                            <div className={`scanner-crop-stage ${isAutoScanning ? 'scan-lock' : ''}`}>
                                <ReactCrop
                                    crop={crop}
                                    onChange={(nextCrop) => setCrop(nextCrop)}
                                    onComplete={(nextCrop) => setCompletedCrop(nextCrop)}
                                    minWidth={120}
                                    minHeight={120}
                                    keepSelection
                                    disabled={isAutoScanning}
                                >
                                    <img
                                        ref={pendingImageRef}
                                        src={pendingCapture}
                                        alt="Capture to crop"
                                        className="scanner-crop-image"
                                        onLoad={handlePendingImageLoad}
                                    />
                                </ReactCrop>
                                {isAutoScanning && (
                                    <div className="scanner-scanline-overlay" aria-hidden="true">
                                        <div className="scanner-scanline" />
                                    </div>
                                )}
                            </div>

                            <div className={`scanner-crop-toolbar ${isAutoScanning ? 'scan-lock' : ''}`}>
                                {!isAutoScanning && (
                                    <div className="scanner-crop-actions">
                                        <button
                                            type="button"
                                            className="crop-action-btn secondary"
                                            onClick={handleRetake}
                                            disabled={isCapturing}
                                        >
                                            Retake
                                        </button>
                                        <button
                                            type="button"
                                            className="crop-action-btn primary"
                                            onClick={handleApplyCrop}
                                            disabled={isCapturing}
                                        >
                                            {isCapturing ? 'Applying...' : 'Apply Crop'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* ========================================================= */}
                {/* === 3. TOP-LEVEL ERROR BANNER === */}
                {/* ========================================================= */}
                {error && <div className="scanner-error">{error}</div>}

                {/* ========================================================= */}
                {/* === 4. EXPANDED PAGE PREVIEW OVERLAY === */}
                {/* ========================================================= */}
                {expandedPage && (
                    <div className="scanner-expanded-overlay" onClick={() => setExpandedPageId(null)}>
                        <div className="scanner-expanded-content" onClick={(e) => e.stopPropagation()}>
                            <button
                                type="button"
                                className="scanner-close"
                                style={{ position: 'absolute', top: '-10px', right: '-10px' }}
                                onClick={() => setExpandedPageId(null)}
                            >
                                ✕
                            </button>
                            <img src={expandedPage.url} alt="Expanded scanned page" className="scanner-expanded-image" />
                        </div>
                    </div>
                )}

            </div>
        </div>,
        document.body
    );
};

export default CameraScannerModal;
