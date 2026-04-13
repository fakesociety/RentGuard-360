/**
 * ============================================
 *  AdminSidebar Component
 *  Navigation panel for admin section
 * ============================================
 *
 * STRUCTURE:
 * - Nav links definition
 * - Theme/Language toggles embed
 * - Logout logic
 *
 * DEPENDENCIES:
 * - AuthContext, ThemeContext, LanguageContext
 * - react-router-dom
 * ============================================
 */
import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeToggle } from '@/components/ui/Toggle';
import LanguageToggle from '@/components/ui/LanguageToggle';
import {
    LayoutDashboard,
    Users,
    BarChart3,
    CreditCard,
    Shield,
    LogOut,
    ArrowLeft
} from 'lucide-react';
import './AdminSidebar.css';

const AdminSidebar = ({ onNavigate }) => {
    const { userAttributes, logout } = useAuth();
    const { t } = useLanguage();
    const { isDark } = useTheme();

    const navItems = [
        { path: '/admin', icon: LayoutDashboard, label: t('admin.dashboard'), end: true },
        { path: '/admin/users', icon: Users, label: t('admin.usersTab') },
        { path: '/admin/analytics', icon: BarChart3, label: t('admin.analytics') },
        { path: '/admin/stripe', icon: CreditCard, label: t('admin.stripeTab') }
    ];

    return (
        <aside className={`admin-sidebar ${isDark ? 'dark' : 'light'}`}>
            <div className="sidebar-header">
                <Link to="/dashboard" className="sidebar-logo" title={t('nav.backToDashboard')}>
                    <Shield className="logo-icon" />
                    <span className="logo-text">RentGuard</span>
                </Link>
            </div>

            <div className="sidebar-back-link">
                <Link to="/dashboard" className="back-link" onClick={onNavigate}>
                    <ArrowLeft size={16} />
                    <span>{t('nav.backToDashboard')}</span>
                </Link>
            </div>

            <nav className="sidebar-nav">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.end}
                        className={({ isActive }) =>
                            `sidebar-nav-item ${isActive ? 'active' : ''}`
                        }
                        onClick={onNavigate}
                    >
                        <item.icon className="nav-icon" size={20} />
                        <span className="nav-label">{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="sidebar-footer">
                <div className="sidebar-control">
                    <LanguageToggle />
                </div>

                <div className="sidebar-control theme-control">
                    <ThemeToggle showLabel={true} />
                </div>

                <div className="sidebar-user">
                    <div className="user-avatar">
                        {userAttributes?.name?.charAt(0)?.toUpperCase() || 'A'}
                    </div>
                    <div className="user-info">
                        <span className="user-name">{userAttributes?.name || 'Admin'}</span>
                        <span className="user-role">{t('admin.administrator')}</span>
                    </div>
                </div>

                <button
                    className="sidebar-footer-btn logout-btn"
                    onClick={logout}
                    title={t('nav.logout')}
                >
                    <LogOut size={18} />
                    <span>{t('nav.logout')}</span>
                </button>
            </div>
        </aside>
    );
};

export default AdminSidebar;