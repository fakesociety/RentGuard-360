import React from 'react';

const ScannerThumbnailGallery = ({
    pages,
    activePageId,
    onSelect,
    onDelete,
    onExpand,
}) => {
    
    if (!pages.length) {
        return null; 
    }

    // Horizontal Gallery 
    return (
        <div className="scanner-gallery" aria-label="Scanned pages gallery">
            {pages.map((page, index) => (
                <div
                    key={page.id}
                    className={`scanner-thumb ${activePageId === page.id ? 'active' : ''}`}
                    onClick={() => onSelect(page.id)}
                >
                    {/* Thumbnail Image */}
                    <button
                        type="button"
                        className="scanner-thumb-image-wrap"
                        onClick={(e) => {
                            e.stopPropagation();
                            onExpand(page.id);
                        }}
                    >
                        <img 
                            src={page.url} 
                            alt={`Scanned page ${index + 1}`} 
                            className="scanner-thumb-image" 
                        />
                    </button>

                    <button
                        type="button"
                        className="scanner-delete-icon"
                        onClick={(e) => {
                            e.stopPropagation(); // Prevents triggering the expand/select actions
                            onDelete(page.id);
                        }}
                        aria-label="Delete page"
                    >
                        ✕
                    </button>
                </div>
            ))}
        </div>
    );
};

export default ScannerThumbnailGallery;