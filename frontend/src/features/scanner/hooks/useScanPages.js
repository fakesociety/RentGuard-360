import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { revokeImageUrl, totalBytesForPages } from '../services/imageProcessing';

export const useScanPages = () => {
    const [pages, setPages] = useState([]);
    const [activePageId, setActivePageId] = useState(null);
    const pagesRef = useRef([]);

    useEffect(() => {
        pagesRef.current = pages;
    }, [pages]);

    const addPage = useCallback((page) => {
        setPages((prev) => [...prev, page]);
        setActivePageId(page.id);
    }, []);

    const removePage = useCallback((pageId) => {
        setPages((prev) => {
            const target = prev.find((item) => item.id === pageId);
            if (target) {
                revokeImageUrl(target);
            }

            const next = prev.filter((item) => item.id !== pageId);
            setActivePageId((current) => {
                if (current !== pageId) return current;
                return next[0]?.id ?? null;
            });
            return next;
        });
    }, []);

    const clearPages = useCallback(() => {
        setPages((prev) => {
            prev.forEach((page) => revokeImageUrl(page));
            return [];
        });
        setActivePageId(null);
    }, []);

    useEffect(() => () => {
        pagesRef.current.forEach((page) => revokeImageUrl(page));
    }, []);

    const activePage = useMemo(
        () => pages.find((page) => page.id === activePageId) || null,
        [activePageId, pages]
    );

    const totalBytes = useMemo(() => totalBytesForPages(pages), [pages]);

    return {
        pages,
        activePage,
        activePageId,
        totalBytes,
        setActivePageId,
        addPage,
        removePage,
        clearPages,
    };
};
