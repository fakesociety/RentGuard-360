import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLanguage } from '../../../contexts/LanguageContext';
import FileDropZone from '../../../components/ui/FileDropZone';

const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 בייט';
    const k = 1024;
    const sizes = ['בייט', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

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
    setError,
    customFileName,
    isUploading,
    uploadVisualStatus,
    uploadProgress,
    removeSelectedFile,
    fileInputRef,
    handleInputChange,
}) => {
    const { t, isRTL } = useLanguage();

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
    );
};

export default UploadDropzone;