import React from 'react';

const ScannerThumbnailGallery = ({
    pages,
    activePageId,
    onSelect,
    onDelete,
    onExpand,
}) => {
    
    // --- 1. Empty State ---
    // Returns nothing if there are no pages, keeping the UI clean
    if (!pages.length) {
        return null; 
    }

    // --- 2. Horizontal Gallery ---
    return (
        <div className="scanner-gallery" aria-label="Scanned pages gallery">
            {pages.map((page, index) => (
                <div
                    key={page.id}
                    className={`scanner-thumb ${activePageId === page.id ? 'active' : ''}`}
                    onClick={() => onSelect(page.id)}
                >
                    {/* --- 3. Thumbnail Image (Click to Expand) --- */}
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

                    {/* --- 4. Delete Action (Floating X Icon) --- */}
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