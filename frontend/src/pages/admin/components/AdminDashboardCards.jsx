import React from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { FileText, CheckCircle, Users, Clock } from 'lucide-react';

const AdminDashboardCards = ({ stats }) => {
    const { t } = useLanguage();

    const formatTime = (seconds) => {
        if (!seconds) return '—';
        if (seconds < 60) return `${Math.round(seconds)} ${t('admin.seconds')}`;
        return `${Math.round(seconds / 60)} ${t('admin.minutes')}`;
    };

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
                    <span className="card-value">{formatTime(stats?.analysis?.avgAnalysisTimeSeconds)}</span>
                    <span className="card-label">{t('admin.avgAnalysisTime')}</span>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboardCards;