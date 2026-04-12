/**
 * ============================================
 *  LanguageContext
 *  i18n Provider with Hebrew/English Support
 * ============================================
 * 
 * STRUCTURE:
 * - translations object (Hebrew & English dictionaries)
 * - LanguageContext creation
 * - LanguageProvider component with localStorage persistence
 * - useLanguage hook for consuming context
 * 
 * DEPENDENCIES:
 * - React Context API
 * - localStorage for language preference persistence
 * 
 * NOTES:
 * - Default language is Hebrew ('he')
 * - RTL direction is set automatically on document
 * - Use t('key.path') to get translated strings
 * 
 * ============================================
 */
/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// ============================================
// TRANSLATIONS
// ============================================

import { he } from './he';
import { en } from './en';

const translations = { he, en };;

const translateFromLanguage = (language, key) => {
    const keys = String(key || '').split('.');
    let value = translations[language] || translations.he;
    for (const k of keys) {
        value = value?.[k];
    }
    return value || key;
};

const defaultLanguageContext = {
    language: 'he',
    setLanguage: () => {},
    t: (key) => translateFromLanguage('he', key),
    toggleLanguage: () => {},
    isRTL: true,
    translations: translations.he,
};

// Create context
const LanguageContext = createContext(defaultLanguageContext);

// Provider component
export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState(() => {
        // Get saved language or default to Hebrew
        const saved = localStorage.getItem('rentguard-language');
        return saved || 'he';
    });

    useEffect(() => {
        // Save language preference
        localStorage.setItem('rentguard-language', language);
        // Update document direction
        document.documentElement.dir = language === 'he' ? 'rtl' : 'ltr';
        document.documentElement.lang = language;
    }, [language]);

    const t = useCallback((key) => translateFromLanguage(language, key), [language]);

    const toggleLanguage = useCallback(() => {
        setLanguage(prev => prev === 'he' ? 'en' : 'he');
    }, []);

    const isRTL = language === 'he';

    return (
        <LanguageContext.Provider value={{
            language,
            setLanguage,
            t,
            toggleLanguage,
            isRTL,
            translations: translations[language]
        }}>
            {children}
        </LanguageContext.Provider>
    );
};

// Custom hook
export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (context === defaultLanguageContext && import.meta.env.DEV) {
        console.warn('useLanguage fallback is active. Wrap components with LanguageProvider to avoid missing translations.');
    }
    return context;
};

