/**
 * ============================================
 *  useScannerUIState Hook
 *  UI state manager for scanner modal flow
 * ============================================
 *
 * STRUCTURE:
 * - Camera lifecycle state (active/inactive)
 * - Crop flow state (pending image, crop bounds)
 * - Async UI state (capturing, auto-scan, PDF build)
 * - Shared UI helpers (error handling, reset handlers)
 *
 * DEPENDENCIES:
 * - React useState, useCallback
 * ============================================
 */
import { useCallback, useState } from 'react';

export const useScannerUIState = () => {
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [isCropMode, setIsCropMode] = useState(false);
    const [isCapturing, setIsCapturing] = useState(false);
    const [isBuildingPdf, setIsBuildingPdf] = useState(false);
    const [isAutoScanning, setIsAutoScanning] = useState(false);
    const [pendingCapture, setPendingCapture] = useState(null);
    const [crop, setCrop] = useState(null);
    const [completedCrop, setCompletedCrop] = useState(null);
    const [expandedPageId, setExpandedPageId] = useState(null);
    const [error, setError] = useState('');

    const startCamera = useCallback(() => {
        setIsCameraActive(true);
        setError('');
    }, []);

    const stopCamera = useCallback(() => {
        setIsCameraActive(false);
    }, []);

    const enableCropMode = useCallback((captureDataUrl = null) => {
        setPendingCapture(captureDataUrl);
        setCrop(null);
        setCompletedCrop(null);
        setIsAutoScanning(false);
        setIsCropMode(true);
    }, []);

    const disableCropMode = useCallback(() => {
        setPendingCapture(null);
        setCrop(null);
        setCompletedCrop(null);
        setIsAutoScanning(false);
        setIsCropMode(false);
    }, []);

    const setErrorMessage = useCallback((message) => {
        setError(message || '');
    }, []);

    const clearError = useCallback(() => {
        setError('');
    }, []);

    const resetUI = useCallback(() => {
        setError('');
        setPendingCapture(null);
        setCrop(null);
        setCompletedCrop(null);
        setIsAutoScanning(false);
        setIsCapturing(false);
        setIsBuildingPdf(false);
        setExpandedPageId(null);
        setIsCropMode(false);
    }, []);

    return {
        isCameraActive,
        isCropMode,
        isCapturing,
        isBuildingPdf,
        isAutoScanning,
        pendingCapture,
        crop,
        completedCrop,
        expandedPageId,
        error,
        setIsCameraActive,
        setIsCropMode,
        setIsCapturing,
        setIsBuildingPdf,
        setIsAutoScanning,
        setPendingCapture,
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
    };
};