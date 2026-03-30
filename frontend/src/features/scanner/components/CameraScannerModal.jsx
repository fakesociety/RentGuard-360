import React, { useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import Webcam from 'react-webcam';
import { useScanPages } from '../hooks/useScanPages';
import { compressCaptureDataUrl } from '../services/imageProcessing';
import { buildPdfFileFromPages } from '../services/pdfBuilder';
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
    const webcamRef = useRef(null);
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

        setIsCapturing(true);
        try {
            const page = await compressCaptureDataUrl(frameDataUrl, {
                maxWidth: 1600,
                quality: 0.76,
            });
            addPage(page);
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
                        />
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
                                disabled={isCapturing || isBuildingPdf}
                            >
                                <div className="shutter-inner"></div>
                            </button>

                            <button
                                type="button"
                                className="finish-scan-btn"
                                onClick={handleCreatePdf}
                                disabled={!pages.length || isBuildingPdf || isCapturing}
                            >
                                {isBuildingPdf ? 'Building...' : `Done (${pages.length})`}
                            </button>
                        </div>
                    </div>

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