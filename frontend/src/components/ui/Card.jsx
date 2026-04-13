/**
 * ============================================
 *  Card Component
 *  General Purpose Container Component
 * ============================================
 * 
 * STRUCTURE:
 * - Supports variants: elevated, outlined, glass
 * - Handles hover states and padding
 * 
 * DEPENDENCIES:
 * - Card.css
 * ============================================
 */

/* ==========================================================================
 * 1. Imports
 * ========================================================================== */
import React from 'react';
import PropTypes from 'prop-types';
import './Card.css';

/* ==========================================================================
 * 2. Component Definition
 * ========================================================================== */
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

    /* ======================================================================
     * 3. Render / JSX
     * ====================================================================== */
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

/* ==========================================================================
 * 4. PropTypes
 * ========================================================================== */
Card.propTypes = {
    children: PropTypes.node,
    className: PropTypes.string,
    onClick: PropTypes.func,
    variant: PropTypes.oneOf(['elevated', 'outlined', 'glass']),
    padding: PropTypes.oneOf(['sm', 'md', 'lg']),
    hoverable: PropTypes.bool
};
