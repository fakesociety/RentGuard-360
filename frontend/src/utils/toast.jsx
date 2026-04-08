import React from 'react';
import toast from 'react-hot-toast';
import './toast.css';

const TOAST_TYPES = new Set(['success', 'error', 'warning', 'info']);
const TOAST_BURST_WINDOW_MS = 480;
const TOAST_STAGGER_STEP_MS = 80;
const TOAST_MAX_STAGGER_STEPS = 3;

let toastBurstIndex = 0;
let lastToastAt = 0;

function getStaggerDelayMs() {
    const now = Date.now();
    if (now - lastToastAt > TOAST_BURST_WINDOW_MS) {
        toastBurstIndex = 0;
    } else {
        toastBurstIndex += 1;
    }
    lastToastAt = now;
    return Math.min(toastBurstIndex, TOAST_MAX_STAGGER_STEPS) * TOAST_STAGGER_STEP_MS;
}

function normalizeType(input) {
    return TOAST_TYPES.has(input) ? input : 'success';
}

function getIcon(type) {
    if (type === 'error') return '✕';
    if (type === 'warning') return '!';
    if (type === 'info') return 'i';
    return '✓';
}

function getDocumentDirection() {
    if (typeof document === 'undefined') return 'ltr';
    return document.documentElement?.dir === 'rtl' ? 'rtl' : 'ltr';
}

function getCloseLabel() {
    return getDocumentDirection() === 'rtl' ? 'סגור' : 'Dismiss';
}

export function showAppToast(payload) {
    const detail = payload || {};
    const type = normalizeType(detail.type || detail.variant);
    const icon = detail.icon;
    const title = detail.title || '';
    const message = detail.message || '';
    const duration = typeof detail.duration === 'number'
        ? detail.duration
        : (typeof detail.ttlMs === 'number' ? detail.ttlMs : 5500);
    const staggerMs = typeof detail.staggerMs === 'number'
        ? Math.max(0, detail.staggerMs)
        : getStaggerDelayMs();
    const direction = getDocumentDirection();

    return toast.custom(
        (instance) => {
            const isVisible = instance.visible;
            return (
                <div 
                    className={`rg-hot-toast rg-hot-toast--${type} ${isVisible ? 'rg-hot-toast--visible' : 'rg-hot-toast--hidden'}`} 
                    style={{
                        '--rg-toast-stagger-ms': `${staggerMs}ms`,
                        '--rg-toast-exit-stagger-ms': `${Math.round(staggerMs * 0.5)}ms`,
                    }}
                    dir={direction} 
                    role="status" 
                    aria-live={type === 'error' ? 'assertive' : 'polite'}
                >
                    <span className="rg-hot-toast__icon" aria-hidden="true">{icon ?? getIcon(type)}</span>
                    <div className="rg-hot-toast__content">
                        {title && <div className="rg-hot-toast__title">{title}</div>}
                        {message && <div className="rg-hot-toast__message">{message}</div>}
                    </div>
                    <button
                        type="button"
                        className="rg-hot-toast__dismiss"
                        onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            toast.dismiss(instance.id);
                        }}
                        aria-label={getCloseLabel()}
                        title={getCloseLabel()}
                    >
                        ×
                    </button>
                </div>
            );
        },
        {
            id: detail.id,
            duration,
            position: detail.position || 'top-right',
            removeDelay: typeof detail.removeDelay === 'number' ? detail.removeDelay : 850,
        }
    );
}

export function emitAppToast(payload) {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('rg:toast', { detail: payload }));
}

export function emitLegacyToast(title, message, options = {}) {
    emitAppToast({ title, message, ...options });
}
