/**
 * ============================================
 *  useScanPages Hook
 *  State management for the document scanner
 * ============================================
 * 
 * STRUCTURE:
 * - Pages list state
 * - Active page selection
 * - Helpers: addPage, removePage, clearPages
 * 
 * DEPENDENCIES:
 * - imageProcessing.js (revokeImageUrl)
 * ============================================
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { revokeImageUrl, totalBytesForPages } from '@/features/scanner/services/imageProcessing';

export const useScanPages = () => {
    // ------------------------------------------------------------------------
    // ACTIVE SESSION STATE: Array of cropped document images in memory
    // ------------------------------------------------------------------------
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
            const index = prev.findIndex((item) => item.id === pageId);
            if (index === -1) return prev;
            
            const target = prev[index];
            revokeImageUrl(target);

            const next = prev.filter((item) => item.id !== pageId);
            setActivePageId((current) => {
                if (current !== pageId) return current;
                if (next.length === 0) return null;
                const nextIndex = Math.min(index, next.length - 1);
                return next[nextIndex].id;
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
