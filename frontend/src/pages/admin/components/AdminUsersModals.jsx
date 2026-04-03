import React from 'react';
import ReactDOM from 'react-dom';
import Button from '../../../components/ui/Button';

const AdminUsersModals = ({
    modal,
    closeModal,
    handleModalConfirm,
    isDark,
    t
}) => {
    if (!modal.isOpen || !['disable', 'delete', 'deleteConfirm'].includes(modal.type)) return null;

    return ReactDOM.createPortal(
        <div className={`admin-modal-overlay ${isDark ? 'dark' : 'light'}`} onClick={closeModal}>
            <div className={`admin-modal ${isDark ? 'dark' : 'light'} ${(modal.type === 'delete' || modal.type === 'deleteConfirm') ? 'modal-error' : 'modal-warning'}`} onClick={e => e.stopPropagation()}>
                <h3>{modal.title}</h3>
                <p style={{ whiteSpace: 'pre-line' }}>{modal.message}</p>
                <div className="modal-actions">
                    <Button variant="secondary" onClick={closeModal}>
                        {t('common.cancel') || 'Cancel'}
                    </Button>
                    <Button
                        variant={(modal.type === 'delete' || modal.type === 'deleteConfirm') ? 'danger' : 'primary'}
                        onClick={handleModalConfirm}
                    >
                        {t('common.confirm') || 'Confirm'}
                    </Button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default AdminUsersModals;