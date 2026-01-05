import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { Settings, Bell, Shield, Database, Mail } from 'lucide-react';
import './AdminDashboard.css';

// Placeholder settings page
const AdminSettings = () => {
    const { t, isRTL } = useLanguage();
    const { isDark } = useTheme();

    const settingsGroups = [
        {
            icon: Bell,
            title: t('admin.notifications') || 'Notifications',
            description: t('admin.notificationsDesc') || 'Configure email and push notifications'
        },
        {
            icon: Shield,
            title: t('admin.security') || 'Security',
            description: t('admin.securityDesc') || 'Authentication and access control'
        },
        {
            icon: Database,
            title: t('admin.dataRetention') || 'Data Retention',
            description: t('admin.dataRetentionDesc') || 'Contract storage and backup settings'
        },
        {
            icon: Mail,
            title: t('admin.emailTemplates') || 'Email Templates',
            description: t('admin.emailTemplatesDesc') || 'Customize notification emails'
        }
    ];

    return (
        <div className={`admin-dashboard page-container ${isDark ? 'dark' : 'light'}`} dir={isRTL ? 'rtl' : 'ltr'}>
            <header className="admin-header">
                <h1>
                    <Settings size={28} style={{ marginInlineEnd: '12px' }} />
                    {t('admin.settings') || 'Settings'}
                </h1>
                <p>{t('admin.settingsDescription') || 'System configuration and preferences'}</p>
            </header>

            <div className="admin-content">
                <div className="settings-grid">
                    {settingsGroups.map((group, index) => (
                        <div key={index} className="settings-card">
                            <div className="settings-card-icon">
                                <group.icon size={24} />
                            </div>
                            <div className="settings-card-content">
                                <h3>{group.title}</h3>
                                <p>{group.description}</p>
                            </div>
                            <span className="settings-badge">{t('common.comingSoon') || 'Coming Soon'}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AdminSettings;
