import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
    UserRound,
    Palette,
    BellRing,
    MessageCircle,
    Info,
    ShieldAlert,
    Lightbulb,
    AlertTriangle,
    X,
    CreditCard,
    LogOut,
    Trash2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext/LanguageContext';
import { deleteAllUserContracts } from '../../services/api';
import Toggle from '../../components/ui/Toggle';
import './SettingsPage.css';

const SettingsPage = () => {
    const CHAT_AUTO_OPEN_PREF_KEY = 'rentguard_chat_auto_open_contract';
    const { userAttributes, logout, deleteAccount, user } = useAuth();
    const { isDark, toggleTheme } = useTheme();
    const { t, isRTL } = useLanguage();
    const navigate = useNavigate();

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState('');
    const [chatAutoOpenEnabled, setChatAutoOpenEnabled] = useState(() => {
        try {
            const saved = localStorage.getItem(CHAT_AUTO_OPEN_PREF_KEY);
            if (saved === null) return true;
            return saved !== 'false';
        } catch {
            return true;
        }
    });

    const handleChatAutoOpenToggle = () => {
        setChatAutoOpenEnabled((prev) => {
            const next = !prev;
            try {
                localStorage.setItem(CHAT_AUTO_OPEN_PREF_KEY, String(next));
            } catch {
                // Ignore storage failures and keep in-memory value.
            }
            return next;
        });
    };

    const handleLogout = async () => {
        await logout();
    };

    const handleDeleteAccount = async () => {
        if (deleteConfirmText !== 'DELETE') {
            setDeleteError(t('account.typeDeleteToConfirmError'));
            return;
        }

        setIsDeleting(true);
        setDeleteError('');

        try {
            const userId = user?.username || user?.userId;
            if (userId) {
                await deleteAllUserContracts(userId);
            }

            const result = await deleteAccount();

            if (!result.success) {
                setDeleteError(result.error || t('account.deleteAccountError'));
                setIsDeleting(false);
            }
        } catch (error) {
            console.error('Delete account error:', error);
            setDeleteError(t('account.deleteAccountError'));
            setIsDeleting(false);
        }
    };

    const userInitial = (userAttributes?.name || userAttributes?.email || 'U').charAt(0).toUpperCase();

    return (
        <div className="settings-container" dir={isRTL ? 'rtl' : 'ltr'}>
            
            {/* Header Section */}
            <div className="settings-header">
                <h1 className="settings-title">{t('settings.title')}</h1>
                <p className="settings-subtitle">
                    {t('settings.subtitle')}
                </p>
            </div>

            {/* Bento Box Grid */}
            <div className="bento-grid">
                
                {/* 1. Profile Cube */}
<div className="bento-card bento-col-4 profile-cube">
    <div className="profile-avatar-wrapper">
        <div className="profile-avatar-giant">{userInitial}</div>
    </div>
    <div className="profile-info-block">
        <span className="premium-badge">{t('settings.activeAccount')}</span>
        <h2>{userAttributes?.name || t('settings.profileFallbackUser')}</h2>
        <p className="profile-email">{userAttributes?.email}</p>
        
        {/* ADDED LOGOUT HERE */}
        <div className="profile-actions" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'inherit' }}>
            <button className="btn-secondary" onClick={handleLogout}>
                <LogOut size={16} />
                {t('nav.logout')}
            </button>
        </div>
    </div>
</div>

                {/* 2. Appearance Cube */}
                <div className="bento-card bento-col-2 flex-between">
                    <div>
                        <div className="cube-icon-wrapper icon-primary">
                            <Palette size={24} />
                        </div>
                        <h3>{t('settings.appearanceTitle')}</h3>
                        <p className="cube-desc">{t('settings.appearanceDesc')}</p>
                    </div>
                    <div className="cube-action-row">
                        <span className="status-text">{isDark ? t('settings.darkMode') : t('settings.lightMode')}</span>
                        <Toggle checked={isDark} onChange={toggleTheme} />
                    </div>
                </div>

                {/* 3. Billing Placeholder Cube */}
                <div className="bento-card bento-col-2 flex-between">
                    <div>
                        <div className="cube-icon-wrapper icon-secondary">
                            <CreditCard size={24} />
                        </div>
                        <h3>{t('billing.title')}</h3>
                        
                        {/* Fake Credit Card visual for future logic */}
                        <div className="fake-credit-card">
                            <div className="card-dots">
                                <div className="dot red"></div>
                                <div className="dot orange"></div>
                            </div>
                            <span className="card-number">•••• 4421</span>
                        </div>
                    </div>
                    <button className="cube-link-btn text-secondary" onClick={() => navigate('/billing')}>
                        {t('settings.manageBilling')} &rarr;
                    </button>
                </div>

                {/* 4. Contract Chat Behavior */}
                <div className="bento-card bento-col-2 flex-between">
                    <div>
                        <div className="cube-icon-wrapper icon-primary">
                            <MessageCircle size={24} />
                        </div>
                        <h3>{t('settings.chatBehaviorTitle')}</h3>
                        <p className="cube-desc">{t('settings.chatBehaviorDesc')}</p>
                    </div>
                    <div className="cube-action-row">
                        <span className="status-text">
                            {chatAutoOpenEnabled
                                ? t('settings.chatAutoOpenOn')
                                : t('settings.chatAutoOpenOff')}
                        </span>
                        <Toggle checked={chatAutoOpenEnabled} onChange={handleChatAutoOpenToggle} />
                    </div>
                </div>

                {/* 5. Notifications Cube */}
                <div className="bento-card bento-col-2 flex-between">
                    <div>
                        <div className="cube-icon-wrapper icon-tertiary">
                            <BellRing size={24} />
                        </div>
                        <h3>{t('settings.alertsTitle')}</h3>
                        <p className="cube-desc">{t('settings.alertsDesc')}</p>
                        
                        <div className="notification-tip-box">
                            <Lightbulb size={14} className="tip-icon" />
                            <span>{t('settings.alertsTip')}</span>
                        </div>
                    </div>
                    <div className="cube-tags">
                        <span className="tag">EMAIL</span>
                        <span className="tag active">SYSTEM</span>
                    </div>
                </div>

                {/* 6. About Cube */}
                <div className="bento-card bento-col-2 flex-between">
                    <div>
                        <div className="cube-icon-wrapper icon-primary">
                            <Info size={24} />
                        </div>
                        <h3>{t('settings.systemInfoTitle')}</h3>
                        <div className="about-list">
                            <div className="about-item">
                                <span className="about-label">{t('settings.versionLabel')}</span>
                                <strong className="about-value">1.0.0</strong>
                            </div>
                            <div className="about-item">
                                <span className="about-label">{t('settings.builtByLabel')}</span>
                                <strong className="about-value">{t('settings.devTeam')}</strong>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 7. Danger Zone */}
<div className="bento-card bento-col-6 danger-cube">
    <div className="danger-info">
        <div className="cube-icon-wrapper icon-danger">
            <ShieldAlert size={32} />
        </div>
        <div>
            <h3 className="danger-title">{t('settings.deleteAccountTitle')}</h3>
            <p className="danger-desc">{t('settings.deleteAccountDesc')}</p>
        </div>
    </div>
    <div className="danger-actions">
        <button className="btn-danger" onClick={() => setShowDeleteModal(true)}>
            <Trash2 size={16} />
            {t('account.deleteAccount')}
        </button>
    </div>
</div>
            </div>

            {/* Delete Account Modal */}
            {showDeleteModal && ReactDOM.createPortal(
                <div className="modal-backdrop" onClick={() => !isDeleting && setShowDeleteModal(false)}>
                    <div className="modal-content delete-modal" onClick={(e) => e.stopPropagation()} dir={isRTL ? 'rtl' : 'ltr'}>
                        <button
                            className="modal-close"
                            onClick={() => setShowDeleteModal(false)}
                            disabled={isDeleting}
                        >
                            <X size={20} strokeWidth={2.5} />
                        </button>

                        <div className="modal-icon danger-icon"><AlertTriangle size={28} /></div>
                        <h2>{t('account.deleteConfirmTitle')}</h2>

                        <div className="delete-warning">
                            <p><strong>{t('account.deleteConfirmMessage')}</strong></p>
                            <p className="warning-text"><strong>{t('account.deleteConfirmWarning')}</strong></p>
                        </div>

                        <div className="delete-confirm-input">
                            <label>{t('account.typeDeleteToConfirm')}</label>
                            <input
                                type="text"
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                placeholder="DELETE"
                                disabled={isDeleting}
                                style={{ textAlign: isRTL ? 'right' : 'left' }}
                            />
                        </div>

                        {deleteError && <p className="error-message">{deleteError}</p>}

                        <div className="modal-actions">
                            <button className="btn-secondary" onClick={() => setShowDeleteModal(false)} disabled={isDeleting}>
                                {t('common.cancel')}
                            </button>
                            <button className="btn-danger" onClick={handleDeleteAccount} disabled={isDeleting || deleteConfirmText !== 'DELETE'}>
                                {isDeleting ? t('account.deletingAccount') : t('account.deleteAccount')}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default SettingsPage;