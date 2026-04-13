/**
 * ============================================
 *  BackButton Component
 *  Standardized Navigation Back Action
 * ============================================
 * 
 * STRUCTURE:
 * - Smart fallback navigation
 * - RTL aware arrows
 * 
 * DEPENDENCIES:
 * - react-router-dom (useNavigate)
 * ============================================
 */

/* ==========================================================================
 * 1. Imports
 * ========================================================================== */
import React from 'react';
import PropTypes from 'prop-types';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import './BackButton.css';

/* ==========================================================================
 * 2. Component Definition
 * ========================================================================== */
const BackButton = ({ to, onClick, label, fallback = '/', className = '' }) => {
    const navigate = useNavigate();
    const { t, isRTL } = useLanguage();

    /* ======================================================================
     * 3. Navigation Logic
     * ====================================================================== */
    const handleDefaultBack = (e) => {
        e.preventDefault();
        if (window.history.length > 2 || (window.history.state && window.history.state.idx > 0)) {
            navigate(-1);
        } else {
            navigate(fallback);
        }
    };

    const handleClick = onClick || (to ? undefined : handleDefaultBack);
    const textLabel = label || t('nav.backToPrevious') || 'Back'; 
    const combinedClassName = `global-back-btn ${className}`.trim();

    /* ======================================================================
     * 4. Render / JSX
     * ====================================================================== */
    const content = (
        <>
            {isRTL && <ArrowLeft size={18} className="back-btn-icon" />}
            <span dir={isRTL ? 'rtl' : 'ltr'}>{textLabel}</span>
            {!isRTL && <ArrowRight size={18} className="back-btn-icon" />}
        </>
    );

    if (to && !onClick) {
        return (
            <Link to={to} className={combinedClassName}>
                {content}
            </Link>
        );
    }

    return (
        <button type="button" onClick={handleClick} className={combinedClassName}>
            {content}
        </button>
    );
};

BackButton.propTypes = {
    to: PropTypes.string,
    onClick: PropTypes.func,
    label: PropTypes.string,
    fallback: PropTypes.string,
    className: PropTypes.string,
};

export default BackButton;
