/**
 * ============================================
 *  Button Component
 *  Standardized UI Button
 * ============================================
 * 
 * STRUCTURE:
 * - Handles variants (primary, secondary, ghost, danger)
 * - Supports loading states with spinners
 * - Handles left/right icons
 * 
 * DEPENDENCIES:
 * - Button.css for styling
 * ============================================
 */

/* ==========================================================================
 * 1. Imports
 * ========================================================================== */
import React from 'react';
import PropTypes from 'prop-types';
import './Button.css';

/* ==========================================================================
 * 2. Component Definition
 * ========================================================================== */
const Button = ({
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    loading = false,
    disabled = false,
    leftIcon = null,
    rightIcon = null,
    onClick,
    children,
    className = '',
    ...props
}) => {
    const classes = [
        'btn',
        `btn-${variant}`,
        `btn-${size}`,
        fullWidth && 'btn-full',
        loading && 'btn-loading',
        disabled && 'btn-disabled',
        className
    ].filter(Boolean).join(' ');

    /* ======================================================================
     * 3. Render / JSX
     * ====================================================================== */
    return (
        <button
            className={classes}
            onClick={onClick}
            disabled={disabled || loading}
            {...props}
        >
            {loading && (
                <span className="btn-spinner" />
            )}
            {!loading && leftIcon && (
                <span className="btn-icon btn-icon-left">{leftIcon}</span>
            )}
            <span className="btn-text">{children}</span>
            {!loading && rightIcon && (
                <span className="btn-icon btn-icon-right">{rightIcon}</span>
            )}
        </button>
    );
};

export default Button;

/* ==========================================================================
 * 4. PropTypes
 * ========================================================================== */
Button.propTypes = {
    variant: PropTypes.oneOf(['primary', 'secondary', 'ghost', 'danger']),
    size: PropTypes.oneOf(['sm', 'md', 'lg']),
    fullWidth: PropTypes.bool,
    loading: PropTypes.bool,
    disabled: PropTypes.bool,
    leftIcon: PropTypes.node,
    rightIcon: PropTypes.node,
    onClick: PropTypes.func,
    children: PropTypes.node.isRequired,
    className: PropTypes.string
};
