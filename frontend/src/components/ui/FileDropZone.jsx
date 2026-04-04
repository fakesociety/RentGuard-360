import React from 'react';
import PropTypes from 'prop-types';
import { useLanguage } from '../../contexts/LanguageContext/LanguageContext';

const FileDropZone = ({
    isDragging,
    canChooseFile,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    openFilePicker,
    blockReason
}) => {
    const { t } = useLanguage();

    return (
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
    );
};

FileDropZone.propTypes = {
    isDragging: PropTypes.bool.isRequired,
    canChooseFile: PropTypes.bool.isRequired,
    handleDragEnter: PropTypes.func.isRequired,
    handleDragLeave: PropTypes.func.isRequired,
    handleDragOver: PropTypes.func.isRequired,
    handleDrop: PropTypes.func.isRequired,
    openFilePicker: PropTypes.func.isRequired,
    blockReason: PropTypes.string
};

export default FileDropZone;
