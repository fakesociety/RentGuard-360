/**
 * ============================================
 *  NotFoundPage Component
 *  404 Error Page
 * ============================================
 * 
 * STRUCTURE:
 * - Simple error message
 * - Return home link
 * ============================================
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';
import './NotFoundPage.css';

const NotFoundPage = () => {
  const { t, isRTL } = useLanguage();

  return (
    <div className="not-found-container" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="not-found-content">
        <h1 className="not-found-title">{t('notFound.title')}</h1>
        <h2 className="not-found-subtitle">{t('notFound.subtitle')}</h2>
        <p className="not-found-text">
          {t('notFound.text')}
        </p>
        <Link to="/" className="not-found-btn">
          {t('notFound.button')}
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
