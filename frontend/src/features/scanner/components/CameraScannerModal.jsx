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
import React, { useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import Webcam from 'react-webcam';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { useScanPages } from '@/features/scanner/hooks/useScanPages';
import { compressCaptureDataUrl, getCroppedImg } from '@/features/scanner/services/imageProcessing';
import { buildPdfFileFromPages } from '@/features/scanner/services/pdfBuilder';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';
import ScannerThumbnailGallery from './ScannerThumbnailGallery';
import './CameraScannerModal.css';

const PDF_MAX_BYTES = 5 * 1024 * 1024;

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
    const {
        pages,
        activePage,
        activePageId,
        totalBytes,
        setActivePageId,
        addPage,
        removePage,
        clearPages,
    } = useScanPages();

    const [isCapturing, setIsCapturing] = useState(false);
    const [isBuildingPdf, setIsBuildingPdf] = useState(false);
    const [pendingCapture, setPendingCapture] = useState(null);
    const [crop, setCrop] = useState(null);
    const [completedCrop, setCompletedCrop] = useState(null);
    const [expandedPageId, setExpandedPageId] = useState(null);
    const [error, setError] = useState('');

    const expandedPage = useMemo(
        () => pages.find((item) => item.id === expandedPageId) || null,
        [expandedPageId, pages]
    );

    if (!open) {
        return null;
    }

    const handleClose = () => {
        setError('');
        setPendingCapture(null);
        setCompletedCrop(null);
        setCrop(null);
        clearPages();
        setExpandedPageId(null);
        onClose();
    };

    const handleCapture = async () => {
        setError('');

        const frameDataUrl = webcamRef.current?.getScreenshot();
        if (!frameDataUrl) {
            setError('Camera frame is not available yet. Please allow camera access and retry.');
            return;
        }

        setError('');
        setPendingCapture(frameDataUrl);
        setCrop(null);
        setCompletedCrop(null);
    };

    const handlePendingImageLoad = (event) => {
        const image = event.currentTarget;
        const initialCrop = {
            unit: 'px',
            x: image.width * 0.05,
            y: image.height * 0.05,
            width: image.width * 0.9,
            height: image.height * 0.9,
        };
        setCrop(initialCrop);
        setCompletedCrop(initialCrop);
    };

    const handleApplyCrop = async () => {
        if (!pendingCapture || !completedCrop || !pendingImageRef.current) {
            setError('Adjust the crop area before confirming.');
            return;
        }

        setIsCapturing(true);
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

            const croppedDataUrl = await getCroppedImg(pendingCapture, naturalCrop);
            const page = await compressCaptureDataUrl(croppedDataUrl, {
                maxWidth: 1600,
                quality: 0.76,
            });
            addPage(page);
            setPendingCapture(null);
            setCompletedCrop(null);
            setCrop(null);
        } catch (captureError) {
            setError(captureError.message || 'Failed to capture page.');
        } finally {
            setIsCapturing(false);
        }
    };

    const handleCreatePdf = async () => {
        if (!pages.length) {
            setError('Capture at least one page before creating the PDF.');
            return;
        }

        setError('');
        setIsBuildingPdf(true);

        try {
            const baseName = (initialFileName || 'scanned-contract').replace(/\.pdf$/i, '').trim() || 'scanned-contract';
            const pdfFile = await buildPdfFileFromPages(pages, {
                fileName: `${baseName}.pdf`,
                marginMm: 8,
            });

            if (pdfFile.size > PDF_MAX_BYTES) {
                setError(
                    `Generated PDF is ${formatMb(pdfFile.size)} and exceeds the 5 MB upload limit. Remove a page and try again.`
                );
                return;
            }

            onComplete(pdfFile);
            handleClose();
        } catch (buildError) {
            setError(buildError.message || 'Failed to generate PDF from scanned pages.');
        } finally {
            setIsBuildingPdf(false);
        }
    };

    return ReactDOM.createPortal(
        <div className="scanner-modal-overlay">
            <div className="scanner-modal" onClick={(e) => e.stopPropagation()}>
                
                {/* --- Header --- */}
                <div className="scanner-modal-header">
                    <button type="button" className="scanner-close" onClick={handleClose}>✕</button>
                </div>

                {/* --- Main Body --- */}
                <div className="scanner-modal-body">
                    
                    {/* 1. Camera Layer */}
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
                            onUserMediaError={(err) => {
                                if (err.name === 'NotAllowedError' || err.name === 'NotFoundError') {
                                    setError(t('upload.cameraAccessError'));
                                } else {
                                    setError(`${t('upload.cameraErrorPrefix')} ${err.message || err.name || 'Unknown'}`);
                                }
                            }}
                        />

                                                {error && (
                            <div className="scanner-error-overlay" style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
                                <span className="scanner-error-icon">📷</span>
                                <h3 className="scanner-error-title">{t('upload.cameraBlockedTitle')}</h3>
                                <p className="scanner-error-message">
                                    {error}
                                </p>
                                <p className="scanner-error-hints">
                                    {t('upload.cameraBlockedDesc1')}<br/>
                                    {t('upload.cameraBlockedDesc2')}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* 2. Spotlight Overlay Layer */}
                    <div className="scanner-spotlight-overlay">
                        <div className="scanner-focus-box">
                            <div className="focus-corners-bottom"></div>
                        </div>
                    </div>

                    {/* 3. Bottom Controls Layer */}
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

                    {pendingCapture && (
                        <div className="scanner-crop-overlay">
                            <div className="scanner-crop-stage">
                                <ReactCrop
                                    crop={crop}
                                    onChange={(nextCrop) => setCrop(nextCrop)}
                                    onComplete={(nextCrop) => setCompletedCrop(nextCrop)}
                                    minWidth={120}
                                    minHeight={120}
                                    keepSelection
                                >
                                    <img
                                        ref={pendingImageRef}
                                        src={pendingCapture}
                                        alt="Capture to crop"
                                        className="scanner-crop-image"
                                        onLoad={handlePendingImageLoad}
                                    />
                                </ReactCrop>
                            </div>

                            <div className="scanner-crop-toolbar">
                                <div className="scanner-crop-actions">
                                    <button
                                        type="button"
                                        className="crop-action-btn secondary"
                                        onClick={() => {
                                            setPendingCapture(null);
                                            setCompletedCrop(null);
                                            setCrop(null);
                                        }}
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
                            </div>
                        </div>
                    )}

                </div>

                {error && <div className="scanner-error">{error}</div>}

                {/* --- Expanded Page Overlay --- */}
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