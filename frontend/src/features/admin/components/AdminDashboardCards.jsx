/**
 * ============================================
 *  AdminDashboardCards Component
 *  Overview cards for the main admin dashboard
 * ============================================
 *
 * STRUCTURE:
 * - High-level metrics
 * - Trend indicators
 *
 * DEPENDENCIES:
 * - formatUtils (formatTime)
 * ============================================
 */
import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';
import { FileText, CheckCircle, Users, Clock } from 'lucide-react';
import { formatTime } from '@/utils/formatUtils';
import './AdminDashboardCards.css';

const AdminDashboardCards = ({ stats }) => {
    const { t } = useLanguage();

    return (
        <div className="summary-cards">
            <div className="summary-card contracts">
                <div className="card-icon">
                    <FileText size={24} />
                </div>
                <div className="card-info">
                    <span className="card-value">{stats?.contracts?.total || 0}</span>
                    <span className="card-label">{t('admin.totalContracts')}</span>
                </div>
            </div>
            <div className="summary-card analyzed">
                <div className="card-icon">
                    <CheckCircle size={24} />
                </div>
                <div className="card-info">
                    <span className="card-value">{stats?.contracts?.analyzed || 0}</span>
                    <span className="card-label">{t('admin.analyzed')}</span>
                </div>
            </div>
            <div className="summary-card users">
                <div className="card-icon">
                    <Users size={24} />
                </div>
                <div className="card-info">
                    <span className="card-value">{stats?.users?.total || 0}</span>
                    <span className="card-label">{t('admin.totalUsers')}</span>
                </div>
            </div>
            <div className="summary-card time">
                <div className="card-icon">
                    <Clock size={24} />
                </div>
                <div className="card-info">
                    <span className="card-value">{formatTime(stats?.analysis?.avgAnalysisTimeSeconds, t)}</span>
                    <span className="card-label">{t('admin.avgAnalysisTime')}</span>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboardCards;
