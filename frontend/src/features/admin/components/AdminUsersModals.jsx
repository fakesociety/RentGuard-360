/**
 * ============================================
 *  AdminUsersModals Component
 *  Modals for user management actions
 * ============================================
 *
 * STRUCTURE:
 * - Disable/Delete confirmation modals
 *
 * DEPENDENCIES:
 * - ReactDOM for Portals
 * ============================================
 */
import React from 'react';
import ReactDOM from 'react-dom';
import Button from '@/components/ui/Button';
import './AdminUsersModals.css';

const DESTRUCTIVE_TYPES = ['delete', 'deleteConfirm'];

const AdminUsersModals = ({
    modal,
    closeModal,
    handleModalConfirm,
    isDark,
    t
}) => {
    if (!modal?.isOpen || !['disable', 'delete', 'deleteConfirm'].includes(modal.type)) return null;

    const isDestructive = DESTRUCTIVE_TYPES.includes(modal.type);

    return ReactDOM.createPortal(
        <div className={`admin-modal-overlay ${isDark ? 'dark' : 'light'}`} onClick={closeModal}>
            <div className={`admin-modal ${isDark ? 'dark' : 'light'} ${isDestructive ? 'modal-error' : 'modal-warning'}`} onClick={e => e.stopPropagation()}>
                <h3>{modal.title}</h3>
                <p className="modal-message-text">{modal.message}</p>
                <div className="modal-actions">
                    <Button variant="secondary" onClick={closeModal}>
                        {t('common.cancel')}
                    </Button>
                    <Button
                        variant={isDestructive ? 'danger' : 'primary'}
                        onClick={handleModalConfirm}
                    >
                        {t('common.confirm')}
                    </Button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default AdminUsersModals;
