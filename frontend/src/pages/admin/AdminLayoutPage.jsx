import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from '@/features/admin/components/AdminSidebar';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Menu, X, Shield } from 'lucide-react';
import './AdminLayoutPage.css';
import './AdminDashboardPage.css';

const AdminLayout = () => {
    const { t, isRTL } = useLanguage();
    const { isDark } = useTheme();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <div
            className={`admin-layout ${isDark ? 'dark' : 'light'}`}
            dir={isRTL ? 'rtl' : 'ltr'}
        >
            <div className="mobile-top-bar">
                <div className="mobile-logo">
                    <Shield size={24} />
                    <span>RentGuard</span>
                </div>
                <button
                    className="mobile-menu-btn"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    aria-label={mobileMenuOpen ? t('admin.closeMenu') : t('admin.openMenu')}
                >
                    {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            <div
                className={`mobile-overlay ${mobileMenuOpen ? 'visible' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
            />

            <div className={`sidebar-container ${mobileMenuOpen ? 'open' : ''}`}>
                <AdminSidebar onNavigate={() => setMobileMenuOpen(false)} />
            </div>

            <main className={`admin-main admin-dashboard page-container ${isDark ? 'dark' : 'light'}`}>
                <Outlet />
            </main>
        </div>
    );
};

export default AdminLayout;
