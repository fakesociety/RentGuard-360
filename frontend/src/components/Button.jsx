import React from 'react';
import './Button.css';

/**
 * Button Component - iOS 26 Liqueed Style
 * 
 * @param {Object} props
 * @param {string} props.variant - Button style: 'primary', 'secondary', 'ghost', 'danger'
 * @param {string} props.size - Button size: 'sm', 'md', 'lg'
 * @param {boolean} props.fullWidth - If true, button takes full width
 * @param {boolean} props.loading - Shows loading spinner
 * @param {boolean} props.disabled - Disables the button
 * @param {React.ReactNode} props.leftIcon - Icon component to show before text
 * @param {React.ReactNode} props.rightIcon - Icon component to show after text
 * @param {function} props.onClick - Click handler
 * @param {React.ReactNode} props.children - Button text/content
 */
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
    ...props
}) => {
    const classes = [
        'btn',
        `btn-${variant}`,
        `btn-${size}`,
        fullWidth && 'btn-full',
        loading && 'btn-loading',
        disabled && 'btn-disabled'
    ].filter(Boolean).join(' ');

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
