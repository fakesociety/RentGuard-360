/**
 * ============================================
 *  DateRangeSelector Component
 *  Reusable date range picker for admin charts
 * ============================================
 */
import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';

const RANGE_OPTIONS = ['7d', '30d', 'month', 'year', 'all'];

const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 3 }, (_, i) => currentYear - i);
};

const DateRangeSelector = ({ value, onChange }) => {
    const { t } = useLanguage();
    const years = getYearOptions();

    const getRangeLabel = (range) => {
        if (range === '7d') return `7 ${t('admin.days')}`;
        if (range === '30d') return `30 ${t('admin.days')}`;
        if (range === 'month') return t('admin.thisMonth');
        if (range === 'year') return t('admin.thisYear');
        return t('admin.allTime');
    };

    return (
        <div className="date-range-selector">
            <div className="date-range-buttons">
                {RANGE_OPTIONS.map(range => (
                    <button
                        key={range}
                        className={`range-btn ${value === range ? 'active' : ''}`}
                        onClick={() => onChange(range)}
                    >
                        {getRangeLabel(range)}
                    </button>
                ))}
                <select
                    className="year-picker"
                    value={String(value).match(/^\d{4}$/) ? value : ''}
                    onChange={(e) => e.target.value && onChange(e.target.value)}
                >
                    <option value="" disabled>{t('admin.selectYear')}</option>
                    {years.map(year => (
                        <option key={year} value={String(year)}>{year}</option>
                    ))}
                </select>
            </div>
        </div>
    );
};

export default DateRangeSelector;
