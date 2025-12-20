import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import Card from '../components/Card';
import Button from '../components/Button';
import Toggle from '../components/Toggle';
import './SettingsPage.css';

const SettingsPage = () => {
    const { userAttributes, logout } = useAuth();
    const { isDark, toggleTheme } = useTheme();
    const { t, isRTL } = useLanguage();

    const handleLogout = async () => {
        await logout();
    };

    return (
        <div className="settings-page" dir={isRTL ? 'rtl' : 'ltr'}>
            <h1 className="settings-title animate-fadeIn">{isRTL ? 'הגדרות' : 'Settings'}</h1>

            {/* Profile Section */}
            <section className="settings-section animate-slideUp">
                <h2 className="section-title">👤 {isRTL ? 'פרופיל' : 'Profile'}</h2>
                <Card variant="glass" padding="lg">
                    <div className="profile-info-grid">
                        <div className="profile-avatar-large">
                            {(userAttributes?.name || userAttributes?.email || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="profile-details">
                            <div className="info-row">
                                <span className="info-label">{isRTL ? 'שם' : 'Name'}</span>
                                <span className="info-value">{userAttributes?.name || (isRTL ? 'לא הוגדר' : 'Not set')}</span>
                            </div>
                            <div className="info-row">
                                <span className="info-label">{isRTL ? 'אימייל' : 'Email'}</span>
                                <span className="info-value">{userAttributes?.email}</span>
                            </div>
                        </div>
                    </div>
                </Card>
            </section>

            {/* Appearance Section */}
            <section className="settings-section animate-slideUp" style={{ animationDelay: '100ms' }}>
                <h2 className="section-title">🎨 {isRTL ? 'תצוגה' : 'Appearance'}</h2>
                <Card variant="elevated" padding="lg">
                    <div className="setting-row">
                        <div className="setting-info">
                            <h3>{isRTL ? 'מצב כהה' : 'Dark Mode'}</h3>
                            <p>{isRTL ? 'החלפה בין ערכות נושא בהירה וכהה' : 'Switch between light and dark themes'}</p>
                        </div>
                        <Toggle
                            checked={isDark}
                            onChange={toggleTheme}
                        />
                    </div>
                    <div className="theme-preview">
                        <div className={`preview-card ${isDark ? 'dark' : 'light'}`}>
                            <div className="preview-header"></div>
                            <div className="preview-content">
                                <div className="preview-line"></div>
                                <div className="preview-line short"></div>
                            </div>
                        </div>
                        <span className="preview-label">{isDark ? (isRTL ? 'מצב כהה' : 'Dark Mode') : (isRTL ? 'מצב בהיר' : 'Light Mode')}</span>
                    </div>
                </Card>
            </section>

            {/* Notifications Section */}
            <section className="settings-section animate-slideUp" style={{ animationDelay: '200ms' }}>
                <h2 className="section-title">🔔 {isRTL ? 'התראות' : 'Notifications'}</h2>
                <Card variant="elevated" padding="lg">
                    <div className="setting-row">
                        <div className="setting-info">
                            <h3>{isRTL ? 'התראות אימייל' : 'Email Notifications'}</h3>
                            <p>{isRTL ? 'קבלו התראה כאשר הניתוח מסתיים' : 'Receive notification when analysis is complete'}</p>
                        </div>
                        <Toggle checked={true} onChange={() => { }} />
                    </div>
                </Card>
            </section>

            {/* About Section */}
            <section className="settings-section animate-slideUp" style={{ animationDelay: '300ms' }}>
                <h2 className="section-title">ℹ️ {isRTL ? 'אודות' : 'About'}</h2>
                <Card variant="elevated" padding="lg">
                    <div className="about-info">
                        <div className="about-row">
                            <span>{isRTL ? 'גרסה' : 'Version'}</span>
                            <span className="about-value">1.0.0</span>
                        </div>
                        <div className="about-row">
                            <span>{isRTL ? 'נבנה על ידי' : 'Built by'}</span>
                            <span className="about-value">Ron & Moty</span>
                        </div>
                        <div className="about-row">
                            <span>{isRTL ? 'פרויקט' : 'Project'}</span>
                            <span className="about-value">{isRTL ? 'פרויקט גמר מחשוב ענן' : 'Cloud Computing Final Project'}</span>
                        </div>
                    </div>
                </Card>
            </section>

            {/* Danger Zone */}
            <section className="settings-section animate-slideUp" style={{ animationDelay: '400ms' }}>
                <h2 className="section-title danger">⚠️ {isRTL ? 'חשבון' : 'Account'}</h2>
                <Card variant="elevated" padding="lg" className="danger-card">
                    <div className="setting-row">
                        <div className="setting-info">
                            <h3>{t('nav.logout')}</h3>
                            <p>{isRTL ? 'התנתקות מהחשבון שלך' : 'Sign out of your account'}</p>
                        </div>
                        <Button variant="danger" onClick={handleLogout}>
                            {t('nav.logout')}
                        </Button>
                    </div>
                </Card>
            </section>
        </div>
    );
};

export default SettingsPage;
