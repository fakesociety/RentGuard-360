import { useState, useRef, useEffect } from 'react';
import { trackChatEvent } from '../utils/chatHelpers';

const CHAT_PANEL_CLOSE_MS = 260;

export function useChatUI(locationPathname) {
    const [open, setOpen] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [footerOffset, setFooterOffset] = useState(24);
    const [useWhyPalette, setUseWhyPalette] = useState(false);
    const [copiedMessageKey, setCopiedMessageKey] = useState('');

    const widgetRef = useRef(null);
    const closeTimerRef = useRef(null);

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
            if (open) {
                closePanel();
            }
        };

        window.addEventListener('rg:nav-menu-opened', handleNavOpened);
        return () => window.removeEventListener('rg:nav-menu-opened', handleNavOpened);
    }, [open]);

    useEffect(() => {
        const updateFooterOffset = () => {
            const isMobile = window.innerWidth <= 768;
            const baseOffset = isMobile ? 12 : 24;
            
            let nextOffset = baseOffset;

            if (!isMobile) {
                const footer = document.querySelector('.app-footer') || document.querySelector('footer');
                const footerRect = footer?.getBoundingClientRect();
                const footerOverlap = footerRect ? Math.max(0, window.innerHeight - footerRect.top) : 0;
                
                if (!open && !isClosing) {
                    // Small / closed chat: Keep above footer so it doesn't hide it
                    nextOffset += footerOverlap;
                } else {
                    // Open chat: Allow it to overlay the footer, just guard against the top navbar
                    const nav = document.querySelector('.nav-container') || document.querySelector('nav');
                    const widgetHeight = widgetRef.current?.querySelector('.chat-widget-panel')?.getBoundingClientRect().height || 560;
                    
                    if (nav && widgetHeight > 0) {
                        const navBottom = nav.getBoundingClientRect().bottom;
                        const minTopGap = 20;
                        const maxOffsetBeforeNav = Math.max(baseOffset, window.innerHeight - navBottom - widgetHeight - minTopGap);
                        nextOffset = Math.min(nextOffset, maxOffsetBeforeNav);
                    }
                }
            }

            setFooterOffset(Math.max(baseOffset, Math.round(nextOffset)));
        };

        updateFooterOffset();
        window.addEventListener('scroll', updateFooterOffset, { passive: true });
        window.addEventListener('resize', updateFooterOffset);
        window.visualViewport?.addEventListener('resize', updateFooterOffset);

        return () => {
            window.removeEventListener('scroll', updateFooterOffset);
            window.removeEventListener('resize', updateFooterOffset);
            window.visualViewport?.removeEventListener('resize', updateFooterOffset);
        };
    }, [open, isClosing]);

    useEffect(() => {
        return () => {
            if (closeTimerRef.current) {
                clearTimeout(closeTimerRef.current);
                closeTimerRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        const updatePaletteBySection = () => {
            const isDashboardRoute = locationPathname === '/dashboard';
            if (!isDashboardRoute) {
                setUseWhyPalette(false);
                return;
            }

            const whySectionNode = document.querySelector('.why-rentguard-section');
            const footerNode = document.querySelector('.app-footer');
            const headerNode = document.querySelector('.chat-widget-header');
            const launcherNode = document.querySelector('.chat-widget-launcher');
            const targetNode = open ? headerNode : launcherNode;

            if (!targetNode) return;

            const targetRect = targetNode.getBoundingClientRect();
            let intersects = false;

            if (whySectionNode) {
                const sectionRect = whySectionNode.getBoundingClientRect();
                if (targetRect.bottom >= sectionRect.top && targetRect.top <= sectionRect.bottom) {
                    intersects = true;
                }
            }

            if (footerNode) {
                const footerRect = footerNode.getBoundingClientRect();
                if (targetRect.bottom >= footerRect.top && targetRect.top <= footerRect.bottom) {
                    intersects = true;
                }
            }

            setUseWhyPalette((prev) => (prev === intersects ? prev : intersects));
        };

        updatePaletteBySection();
        window.addEventListener('scroll', updatePaletteBySection, { passive: true });
        window.addEventListener('resize', updatePaletteBySection);

        return () => {
            window.removeEventListener('scroll', updatePaletteBySection);
            window.removeEventListener('resize', updatePaletteBySection);
        };
    }, [locationPathname, open, footerOffset]);

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

    const openPanel = () => {
        if (closeTimerRef.current) {
            clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }
        setIsClosing(false);
        setOpen(true);
    };

    const closePanel = () => {
        if (!open || isClosing) return;

        setIsClosing(true);
        closeTimerRef.current = setTimeout(() => {
            setOpen(false);
            setIsClosing(false);
            closeTimerRef.current = null;
        }, CHAT_PANEL_CLOSE_MS);
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