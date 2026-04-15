/** Hook that manages chat UI state: panel open/close, auto-scroll, input focus, and mobile responsiveness. */
import { useState, useRef, useEffect, useCallback } from 'react';
import { trackChatEvent } from '../utils/chatHelpers';
import { useBodyScrollLock } from '@/utils/useBodyScrollLock';

const CHAT_PANEL_CLOSE_MS = 260;

export function useChatUI(locationPathname, layoutMetrics = { footerHeight: 0, navHeight: 0 }) {
    const [open, setOpen] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [footerOffset, setFooterOffset] = useState(24);
    const [useWhyPalette, setUseWhyPalette] = useState(false);
    const [copiedMessageKey, setCopiedMessageKey] = useState('');

    const widgetRef = useRef(null);
    const closeTimerRef = useRef(null);

    // Apply scroll lock when mobile chat panel is fully open
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useBodyScrollLock(open && !isClosing && isMobile);

    const openPanel = useCallback(() => {
        if (closeTimerRef.current) {
            clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }
        setIsClosing(false);
        setOpen(true);
    }, []);

    const closePanel = useCallback(() => {
        if (!open || isClosing) return;

        setIsClosing(true);
        closeTimerRef.current = setTimeout(() => {
            setOpen(false);
            setIsClosing(false);
            closeTimerRef.current = null;
        }, CHAT_PANEL_CLOSE_MS);
    }, [open, isClosing]);

    useEffect(() => {
        if (open) {
            trackChatEvent('chat_opened', { route: locationPathname });
            window.dispatchEvent(new CustomEvent('rg:chat-panel-opened'));
        } else {
            window.dispatchEvent(new CustomEvent('rg:chat-panel-closed'));
        }
    }, [open, locationPathname]);

    useEffect(() => {
        const handleNavOpened = () => {
            if (open && window.innerWidth <= 768) {
                closePanel();
            }
        };

        window.addEventListener('rg:nav-menu-opened', handleNavOpened);
        return () => window.removeEventListener('rg:nav-menu-opened', handleNavOpened);
    }, [open, closePanel]);

    // Unified Scroll & Resize listener
    useEffect(() => {
        const handleScrollAndResize = () => {
            // 1. Calculate footer offset
            const isMobile = window.innerWidth <= 768;
            const baseOffset = isMobile ? 12 : 24;
            let nextOffset = baseOffset;

            if (!isMobile) {
                const footerNode = document.querySelector('.app-footer') || document.querySelector('footer');
                const footerRect = footerNode?.getBoundingClientRect();
                const footerOverlap = footerRect ? Math.max(0, window.innerHeight - footerRect.top) : 0;

                if (!open && !isClosing) {
                    nextOffset += footerOverlap;
                } else {
                    const navNode = document.querySelector('.nav-container') || document.querySelector('nav');
                    const navBottom = navNode ? navNode.getBoundingClientRect().bottom : layoutMetrics.navHeight;
                    const widgetHeight = widgetRef.current?.querySelector('.chat-widget-panel')?.getBoundingClientRect().height || 560;
                    
                    if (navBottom > 0 && widgetHeight > 0) {
                        const minTopGap = 20;
                        const maxOffsetBeforeNav = Math.max(baseOffset, window.innerHeight - navBottom - widgetHeight - minTopGap);
                        nextOffset = Math.min(nextOffset, maxOffsetBeforeNav);
                    }
                }
            }
            setFooterOffset(Math.max(baseOffset, Math.round(nextOffset)));

            // 2. Palette calculations
            const isDashboardRoute = locationPathname === '/dashboard';
            if (!isDashboardRoute) {
                setUseWhyPalette(false);
                return;
            }

            const headerNode = widgetRef.current?.querySelector('.chat-widget-header');
            const launcherNode = widgetRef.current?.querySelector('.chat-widget-launcher');
            const targetNode = open ? headerNode : launcherNode;

            if (!targetNode) return;
            const targetRect = targetNode.getBoundingClientRect();

            let intersects = false;

            const whySectionNode = document.querySelector('.why-rentguard-section');
            if (whySectionNode) {
                const sectionRect = whySectionNode.getBoundingClientRect();
                if (targetRect.bottom >= sectionRect.top && targetRect.top <= sectionRect.bottom) {
                    intersects = true;
                }
            }

            const footerNodeForPalette = document.querySelector('.app-footer');
            if (footerNodeForPalette) {
                const footerBounds = footerNodeForPalette.getBoundingClientRect();
                if (targetRect.bottom >= footerBounds.top && targetRect.top <= footerBounds.bottom) {
                    intersects = true;
                }
            }

            setUseWhyPalette((prev) => (prev === intersects ? prev : intersects));
        };

        handleScrollAndResize();
        window.addEventListener('scroll', handleScrollAndResize, { passive: true });
        window.addEventListener('resize', handleScrollAndResize);
        window.visualViewport?.addEventListener('resize', handleScrollAndResize);

        return () => {
            window.removeEventListener('scroll', handleScrollAndResize);
            window.removeEventListener('resize', handleScrollAndResize);
            window.visualViewport?.removeEventListener('resize', handleScrollAndResize);
        };
    }, [open, isClosing, locationPathname, layoutMetrics]);

    useEffect(() => {
        return () => {
            if (closeTimerRef.current) {
                clearTimeout(closeTimerRef.current);
                closeTimerRef.current = null;
            }
        };
    }, []);

    const fallbackCopyText = (text) => {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(textarea);
        return ok;
    };

    const copyMessageText = async (text, key) => {
        const content = String(text || '').trim();
        if (!content) return;

        let copied = false;
        try {
            if (navigator?.clipboard?.writeText) {
                await navigator.clipboard.writeText(content);
                copied = true;
            }
        } catch {
            copied = false;
        }

        if (!copied) {
            copied = fallbackCopyText(content);
        }

        if (copied) {
            setCopiedMessageKey(key);
            setTimeout(() => {
                setCopiedMessageKey((prev) => (prev === key ? '' : prev));
            }, 1300);
            trackChatEvent('chat_message_copied');
        }
    };

    const showPanel = open || isClosing;

    return {
        open,
        setOpen,
        isClosing,
        showPanel,
        openPanel,
        closePanel,
        widgetRef,
        footerOffset,
        useWhyPalette,
        copiedMessageKey,
        copyMessageText
    };
}

