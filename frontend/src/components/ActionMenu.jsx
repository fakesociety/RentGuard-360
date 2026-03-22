import React, { useEffect, useRef } from 'react';

/**
 * Generic dropdown action menu with outside-click and ESC close handling.
 */
const ActionMenu = ({
    isOpen,
    onToggle,
    onClose,
    containerClassName = '',
    triggerClassName = '',
    triggerTitle,
    triggerAriaLabel,
    triggerContent,
    panelClassName = '',
    disabled = false,
    preventDefault = true,
    children,
}) => {
    const menuRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return undefined;

        const handleOutsideClick = (event) => {
            if (!menuRef.current?.contains(event.target)) {
                onClose?.();
            }
        };

        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                onClose?.();
            }
        };

        document.addEventListener('mousedown', handleOutsideClick);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleOutsideClick);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose]);

    return (
        <div className={containerClassName} ref={menuRef}>
            <button
                type="button"
                className={triggerClassName}
                title={triggerTitle}
                aria-label={triggerAriaLabel || triggerTitle}
                aria-expanded={isOpen}
                aria-haspopup="menu"
                disabled={disabled}
                onClick={(event) => {
                    if (preventDefault) {
                        event.preventDefault();
                    }
                    onToggle?.();
                }}
            >
                {triggerContent}
            </button>
            {isOpen && (
                <div className={panelClassName} role="menu">
                    {children}
                </div>
            )}
        </div>
    );
};

export default ActionMenu;
