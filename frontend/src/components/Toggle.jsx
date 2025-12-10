import React, { useState } from 'react';
import './Toggle.css';

/**
 * Toggle Component - iOS Style with Dark/Light Mode Support
 * 
 * @param {Object} props
 * @param {boolean} props.checked - Toggle state
 * @param {function} props.onChange - Change handler
 * @param {string} props.label - Toggle label
 * @param {boolean} props.disabled - Disabled state
 */
const Toggle = ({
    checked = false,
    onChange,
    label,
    disabled = false,
    className = '',
    ...props
}) => {
    const handleToggle = () => {
        if (!disabled && onChange) {
            onChange(!checked);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggle();
        }
    };

    const toggleClasses = [
        'toggle-switch',
        checked && 'toggle-checked',
        disabled && 'toggle-disabled',
    ].filter(Boolean).join(' ');

    return (
        <div className={`toggle-wrapper ${className}`}>
            {label && <span className="toggle-label">{label}</span>}
            <div
                className={toggleClasses}
                onClick={handleToggle}
                onKeyPress={handleKeyPress}
                role="switch"
                aria-checked={checked}
                aria-label={label || 'Toggle'}
                tabIndex={disabled ? -1 : 0}
                {...props}
            >
                <div className="toggle-thumb" />
            </div>
        </div>
    );
};

/**
 * ThemeToggle Component - Specifically for Dark/Light mode switching
 */
export const ThemeToggle = () => {
    const [isDark, setIsDark] = useState(() => {
        // Check localStorage for saved theme preference
        const saved = localStorage.getItem('theme');
        return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
    });

    const toggleTheme = () => {
        const newTheme = !isDark;
        setIsDark(newTheme);
        document.documentElement.setAttribute('data-theme', newTheme ? 'dark' : 'light');
        localStorage.setItem('theme', newTheme ? 'dark' : 'light');
    };

    // Set initial theme
    React.useEffect(() => {
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    }, []);

    return (
        <Toggle
            checked={isDark}
            onChange={toggleTheme}
            label={isDark ? '🌙 Dark Mode' : '☀️ Light Mode'}
        />
    );
};

export default Toggle;
