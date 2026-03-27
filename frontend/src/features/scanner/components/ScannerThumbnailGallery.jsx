import React from 'react';

const formatBytes = (bytes) => {
    if (!bytes) return '0 KB';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const ScannerThumbnailGallery = ({
    pages,
    activePageId,
    onSelect,
    onDelete,
    onExpand,
}) => {
    if (!pages.length) {
        return <p className="scanner-empty">Capture pages to build your contract PDF.</p>;
    }

    return (
        <div className="scanner-gallery" aria-label="Scanned pages gallery">
            {pages.map((page, index) => (
                <div
                    key={page.id}
                    className={`scanner-thumb ${activePageId === page.id ? 'active' : ''}`}
                >
                    <button
                        type="button"
                        className="scanner-thumb-image-wrap"
                        onClick={() => onSelect(page.id)}
                    >
                        <img src={page.url} alt={`Scanned page ${index + 1}`} className="scanner-thumb-image" />
                    </button>

                    <div className="scanner-thumb-meta">
                        <span>Page {index + 1}</span>
                        <span>{formatBytes(page.blob.size)}</span>
                    </div>

                    <div className="scanner-thumb-actions">
                        <button
                            type="button"
                            className="scanner-inline-action"
                            onClick={() => onExpand(page.id)}
                        >
                            Expand
                        </button>
                        <button
                            type="button"
                            className="scanner-inline-action danger"
                            onClick={() => onDelete(page.id)}
                        >
                            Delete
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ScannerThumbnailGallery;
