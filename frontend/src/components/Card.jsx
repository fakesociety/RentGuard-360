import React from 'react';
import './Card.css';

/**
 * Card Component - iOS 26 Liqueed Glassmorphic Style
 * 
 * @param {Object} props
 * @param {string} props.variant - Card style: 'elevated', 'outlined', 'glass'
 * @param {string} props.padding - Padding size: 'sm', 'md', 'lg'
 * @param {boolean} props.hoverable - Enables hover effect
 * @param {function} props.onClick - Click handler (makes card interactive)
 * @param {React.ReactNode} props.children - Card content
 */
const Card = ({
    variant = 'elevated',
    padding = 'md',
    hoverable = false,
    onClick,
    className = '',
    children,
    ...props
}) => {
    const classes = [
        'card',
        `card-${variant}`,
        `card-padding-${padding}`,
        hoverable && 'card-hoverable',
        onClick && 'card-clickable',
        className
    ].filter(Boolean).join(' ');

    return (
        <div
            className={classes}
            onClick={onClick}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            {...props}
        >
            {children}
        </div>
    );
};

export default Card;
