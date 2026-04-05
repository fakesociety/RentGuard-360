/* ==========================================================================
 * TABLE OF CONTENTS
 * ==========================================================================
 * 1. Imports
 * 2. Component Definition
 * 3. Navigation Logic
 * 4. Render / JSX
 * ========================================================================== */

/* ==========================================================================
 * 1. Imports
 * ========================================================================== */
import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext/LanguageContext';
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

export default BackButton;