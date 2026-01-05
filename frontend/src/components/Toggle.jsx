import React from 'react';
import './Toggle.css';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Sun, Moon } from 'lucide-react';

/**
 * Toggle Component - iOS Style with Dark/Light Mode Support
 */
const Toggle = ({
    checked = false,
    onChange,
    label,
    icon,
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
            {(label || icon) && (
                <span className="toggle-label">
                    {icon && <span className="toggle-icon">{icon}</span>}
                    {label}
                </span>
            )}
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
 * ThemeToggle Component - Uses ThemeContext for synced state
 */
export const ThemeToggle = ({ showLabel = true }) => {
    const { isDark, toggleTheme } = useTheme();
    const { t } = useLanguage();

    return (
        <Toggle
            checked={isDark}
            onChange={toggleTheme}
            icon={isDark ? <Moon size={16} /> : <Sun size={16} />}
            label={showLabel ? (isDark ? t('nav.dark') : t('nav.light')) : undefined}
        />
    );
};

export default Toggle;

