/**
 * ============================================
 *  UploadDropzone Component
 *  Drag and drop area for uploading contracts
 * ============================================
 * 
 * STRUCTURE:
 * - react-dropzone wrapper
 * - File validation and previews
 * 
 * DEPENDENCIES:
 * - react-dropzone
 * ============================================
 */
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, CheckCircle2, FilePenLine, FileText, Files, Loader2, Trash2, Upload } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';
import FileDropZone from '@/components/ui/FileDropZone';
import { formatFileSize, stripPdfExtension } from '../utils/uploadUtils';
import './UploadDropzone.css';

const UploadDropzone = ({
    file,
    isDragging,
    canChooseFile,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    openFilePicker,
    blockReason,
    setShowScannerModal,
    customFileName,
    setCustomFileName,
    isUploading,
    uploadVisualStatus,
    uploadProgress,
    removeSelectedFile,
    fileInputRef,
    handleInputChange,
}) => {
    const { t, isRTL } = useLanguage();

    const editableFileBaseName = file
        ? (customFileName ?? stripPdfExtension(file.name))
        : '';

    const normalizedDisplayName = file
        ? `${editableFileBaseName}.pdf`
        : '';

    const uploadItems = file ? [
        {
            id: 'selected-file',
            name: normalizedDisplayName,
            size: file.size,
            progress: isUploading ? uploadProgress : 0,
            status: uploadVisualStatus === 'ready' ? 'ready' : (isUploading ? 'uploading' : 'ready'),
        },
    ] : [];

    return (
        <div className="upload-modern-card">
            <section className="upload-modern-dropzone-wrap">
                <FileDropZone 
                    isDragging={isDragging}
                    canChooseFile={canChooseFile}
                    handleDragEnter={handleDragEnter}
                    handleDragLeave={handleDragLeave}
                    handleDragOver={handleDragOver}
                    handleDrop={handleDrop}
                    openFilePicker={openFilePicker}
                    blockReason={blockReason}
                />
            </section>

            <section className="upload-modern-action-grid">
                <button
                    type="button"
                    className="upload-modern-action-btn upload"
                    onClick={openFilePicker}
                    disabled={!canChooseFile}
                >
                    <Upload className="upload-modern-action-icon" size={18} strokeWidth={2.2} />
                    <span>{t('upload.selectFile')}</span>
                </button>
                <button
                    type="button"
                    className="upload-modern-action-btn scan"
                    onClick={() => {
                        if (!canChooseFile) return;
                        setShowScannerModal(true);
                    }}
                    disabled={!canChooseFile}
                >
                    <Camera className="upload-modern-action-icon" size={18} strokeWidth={2.2} />
                    <span>{t('upload.scanWithCamera')}</span>
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
                        <Files className="upload-modern-section-icon" size={18} strokeWidth={2.2} />
                        <span>{t('upload.selectedFiles')}</span>
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
                                    <FileText size={16} strokeWidth={2.2} />
                                </div>
                                <div className="upload-modern-file-main">
                                    <div className="upload-modern-file-row">
                                        <span className={`upload-modern-file-name ${isRTL ? 'rtl' : 'ltr'}`}>
                                            {isRTL && <span className="upload-modern-file-name-ext" dir="ltr">.pdf</span>}
                                            <span className="upload-modern-file-name-base" dir={isRTL ? 'rtl' : 'ltr'}>{editableFileBaseName}</span>
                                            {!isRTL && <span className="upload-modern-file-name-ext" dir="ltr">.pdf</span>}
                                        </span>
                                        <span className="upload-modern-file-size">{formatFileSize(item.size, t)}</span>
                                    </div>

                                    <div className="upload-modern-file-edit-row">
                                        <label htmlFor="upload-file-name-input" className="upload-modern-file-edit-label">
                                            <FilePenLine size={14} strokeWidth={2.2} />
                                            <span>{t('upload.fileNameLabel')}</span>
                                        </label>

                                        <div className={`upload-modern-file-edit-input-wrap ${isRTL ? 'rtl' : 'ltr'}`}>
                                            {isRTL && <span className="upload-modern-file-edit-ext start" dir="ltr">.pdf</span>}
                                            <input
                                                id="upload-file-name-input"
                                                type="text"
                                                className="upload-modern-file-edit-input"
                                                value={editableFileBaseName}
                                                onChange={(e) => setCustomFileName(stripPdfExtension(e.target.value))}
                                                placeholder={stripPdfExtension(file?.name || '')}
                                                dir={isRTL ? 'rtl' : 'ltr'}
                                                disabled={isUploading}
                                                maxLength={96}
                                            />
                                            {!isRTL && <span className="upload-modern-file-edit-ext end" dir="ltr">.pdf</span>}
                                        </div>
                                    </div>

                                    <div className="upload-modern-progress-track">
                                        <div className={`upload-modern-progress-fill ${item.status === 'uploading' ? 'uploading' : ''}`} style={{ width: `${item.progress}%` }}></div>
                                    </div>

                                    <div className="upload-modern-file-row status-row">
                                        {item.status === 'uploading' ? (
                                            <span className="upload-modern-status uploading">
                                                <Loader2 size={14} strokeWidth={2.4} className="upload-modern-status-icon spin" />
                                                <span>{t('upload.uploading')} {Math.round(item.progress)}%</span>
                                            </span>
                                        ) : (
                                            <span className="upload-modern-status ready">
                                                <CheckCircle2 size={14} strokeWidth={2.4} className="upload-modern-status-icon" />
                                                <span>{t('upload.readyForAnalysis')}</span>
                                            </span>
                                        )}

                                        <button
                                            type="button"
                                            className="upload-modern-delete-btn"
                                            onClick={removeSelectedFile}
                                            disabled={isUploading}
                                            aria-label={t('upload.deleteFile')}
                                        >
                                            <Trash2 size={16} strokeWidth={2.2} />
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
    );
};

export default UploadDropzone;