export const getMetadataCacheKey = (id) => `rentguard_contract_meta_${id}`;

export const readMetadataCache = (id) => {
    if (!id) return null;
    try {
        const raw = localStorage.getItem(getMetadataCacheKey(id));
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        return {
            fileName: parsed.fileName || '',
            propertyAddress: parsed.propertyAddress || '',
            landlordName: parsed.landlordName || '',
            uploadDate: parsed.uploadDate || '',
        };
    } catch {
        return null;
    }
};

export const persistMetadataCache = (contractMeta) => {
    const id = contractMeta?.contractId;
    if (!id) return;
    try {
        localStorage.setItem(getMetadataCacheKey(id), JSON.stringify({
            fileName: contractMeta.fileName || '',
            propertyAddress: contractMeta.propertyAddress || '',
            landlordName: contractMeta.landlordName || '',
            uploadDate: contractMeta.uploadDate || '',
            updatedAt: Date.now(),
        }));
    } catch (error) {
        console.warn('Failed to persist contract metadata cache', error);
    }
};

export const getShareCacheKey = (id) => `rentguard_share_link_${id}`;

export const persistShareLink = (id, url, expiresAt) => {
    if (!id || !url) return;
    try {
        localStorage.setItem(getShareCacheKey(id), JSON.stringify({
            url,
            expiresAt: expiresAt || null,
        }));
    } catch (error) {
        console.warn('Failed to persist share link cache', error);
    }
};

export const clearShareLinkCache = (id) => {
    if (!id) return;
    try {
        localStorage.removeItem(getShareCacheKey(id));
    } catch (error) {
        console.warn('Failed to clear share link cache', error);
    }
};
