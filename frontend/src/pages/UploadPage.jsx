import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { uploadFile } from '../services/api';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import './UploadPage.css';

const UploadPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [file, setFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState('');
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const [uploadedKey, setUploadedKey] = useState('');
    const fileInputRef = useRef(null);

    const [metadata, setMetadata] = useState({
        propertyAddress: '',
        landlordName: '',
        startDate: '',
        monthlyRent: '',
    });

    const validateFile = (file) => {
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (!file.type.includes('pdf')) {
            return 'Only PDF files are allowed';
        }
        if (file.size > maxSize) {
            return 'File size must be less than 10MB';
        }
        return null;
    };

    const handleFileSelect = (selectedFile) => {
        setError('');
        setUploadSuccess(false);
        const validationError = validateFile(selectedFile);
        if (validationError) {
            setError(validationError);
            return;
        }
        setFile(selectedFile);
    };

    const handleDragEnter = (e) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
    const handleDragOver = (e) => { e.preventDefault(); };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) handleFileSelect(droppedFile);
    };

    const handleInputChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) handleFileSelect(selectedFile);
    };

    const handleUpload = async () => {
        if (!file) return;

        setIsUploading(true);
        setUploadProgress(0);
        setError('');

        try {
            // Progress simulation
            setUploadProgress(10);

            // Real upload to S3
            const result = await uploadFile(file, setUploadProgress);

            setUploadProgress(100);
            setUploadedKey(result.key);
            setUploadSuccess(true);
            setFile(null);
            setMetadata({
                propertyAddress: '',
                landlordName: '',
                startDate: '',
                monthlyRent: '',
            });

        } catch (err) {
            console.error('Upload failed:', err);
            setError(err.message || 'Upload failed. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="upload-page">
            <div className="upload-container">
                <div className="upload-header animate-fadeIn">
                    <h1>Upload Contract</h1>
                    <p>Upload your rental contract PDF for AI analysis</p>
                </div>

                {uploadSuccess && (
                    <Card variant="glass" padding="md" className="success-card animate-slideUp">
                        <div className="success-content">
                            <span className="success-icon">✅</span>
                            <div>
                                <h3>Upload Successful!</h3>
                                <p>Your contract is being analyzed. This takes 30-60 seconds.</p>
                                <p className="contract-id">Contract ID: {uploadedKey}</p>
                            </div>
                        </div>
                        <div className="success-actions">
                            <Button variant="primary" onClick={() => navigate('/contracts')}>
                                View My Contracts
                            </Button>
                            <Button variant="secondary" onClick={() => setUploadSuccess(false)}>
                                Upload Another
                            </Button>
                        </div>
                    </Card>
                )}

                {!uploadSuccess && (
                    <div className="upload-content">
                        <Card
                            variant="glass"
                            padding="lg"
                            className={`drop-zone animate-slideUp ${isDragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
                            onDragEnter={handleDragEnter}
                            onDragLeave={handleDragLeave}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                        >
                            {!file ? (
                                <div className="drop-content">
                                    <div className="drop-icon">📄</div>
                                    <h3>Drop your PDF here</h3>
                                    <p>or click to browse</p>
                                    <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                                        Browse Files
                                    </Button>
                                    <p className="drop-hint">Maximum file size: 10MB | PDF only</p>
                                </div>
                            ) : (
                                <div className="file-preview">
                                    <div className="file-icon">📄</div>
                                    <div className="file-info">
                                        <h4>{file.name}</h4>
                                        <p>{formatFileSize(file.size)}</p>
                                    </div>
                                    <Button variant="ghost" onClick={() => setFile(null)} disabled={isUploading}>
                                        ✕
                                    </Button>
                                </div>
                            )}

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf"
                                onChange={handleInputChange}
                                style={{ display: 'none' }}
                            />

                            {isUploading && (
                                <div className="upload-progress">
                                    <div className="progress-bar">
                                        <div className="progress-fill" style={{ width: `${uploadProgress}%` }}></div>
                                    </div>
                                    <p>{uploadProgress}% {uploadProgress < 100 ? 'Uploading...' : 'Complete!'}</p>
                                </div>
                            )}
                        </Card>

                        {error && <div className="error-message animate-slideUp">{error}</div>}

                        {file && !isUploading && (
                            <Card variant="elevated" padding="lg" className="metadata-card animate-slideUp">
                                <h3>Contract Details (Optional)</h3>
                                <div className="metadata-grid">
                                    <Input
                                        label="Property Address"
                                        placeholder="123 Main St, City"
                                        value={metadata.propertyAddress}
                                        onChange={(e) => setMetadata({ ...metadata, propertyAddress: e.target.value })}
                                    />
                                    <Input
                                        label="Landlord Name"
                                        placeholder="John Doe"
                                        value={metadata.landlordName}
                                        onChange={(e) => setMetadata({ ...metadata, landlordName: e.target.value })}
                                    />
                                </div>
                            </Card>
                        )}

                        {file && !isUploading && (
                            <Button
                                variant="primary"
                                size="lg"
                                fullWidth
                                onClick={handleUpload}
                                className="upload-button animate-slideUp"
                            >
                                Upload Contract for Analysis
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default UploadPage;
