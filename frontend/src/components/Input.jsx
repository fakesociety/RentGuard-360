import React from 'react';
import './Input.css';

/**
 * Input Component - iOS Style
 * 
 * @param {Object} props
 * @param {string} props.type - Input type (text, email, password, etc.)
 * @param {string} props.label - Input label
 * @param {string} props.placeholder - Placeholder text
 * @param {string} props.value - Input value
 * @param {function} props.onChange - Change handler
 * @param {string} props.error - Error message
 * @param {string} props.helperText - Helper text below input
 * @param {React.ReactNode} props.leftIcon - Icon on the left
 * @param {React.ReactNode} props.rightIcon - Icon on the right
 * @param {boolean} props.disabled - Disabled state
 * @param {boolean} props.required - Required field
 */
const Input = ({
    type = 'text',
    label,
    placeholder,
    value,
    onChange,
    error,
    helperText,
    leftIcon,
    rightIcon,
    disabled = false,
    required = false,
    className = '',
    ...props
}) => {
    const inputClasses = [
        'input',
        error && 'input-error',
        leftIcon && 'input-with-left-icon',
        rightIcon && 'input-with-right-icon',
        disabled && 'input-disabled'
    ].filter(Boolean).join(' ');

    return (
        <div className={`input-wrapper ${className}`}>
            {label && (
                <label className="input-label">
                    {label}
                    {required && <span className="input-required">*</span>}
                </label>
            )}

            <div className="input-container">
                {leftIcon && (
                    <span className="input-icon input-icon-left">{leftIcon}</span>
                )}

                <input
                    type={type}
                    className={inputClasses}
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    disabled={disabled}
                    required={required}
                    {...props}
                />

                {rightIcon && (
                    <span className="input-icon input-icon-right">{rightIcon}</span>
                )}
            </div>

            {(error || helperText) && (
                <p className={error ? 'input-error-text' : 'input-helper-text'}>
                    {error || helperText}
                </p>
            )}
        </div>
    );
};

export default Input;
