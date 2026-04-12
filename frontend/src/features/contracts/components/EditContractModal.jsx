import React from 'react';
import ReactDOM from 'react-dom';
import { Pencil, X, Check } from 'lucide-react';

const EditContractModal = ({ editModal, setEditModal, saveEdit, isSaving, t, isRTL }) => {
    if (!editModal) return null;

    return ReactDOM.createPortal(
        <div className="lf-modal-overlay" onClick={() => setEditModal(null)}>
            <div
                className="lf-modal-content"
                onClick={e => e.stopPropagation()}
                dir={isRTL ? 'rtl' : 'ltr'}
                role="dialog"
                aria-modal="true"
            >
                <div className="lf-modal-header">
                    <h3><Pencil size={20} /> {t('contracts.editTitle')}</h3>
                    <button type="button" className="lf-modal-close" onClick={() => setEditModal(null)}><X size={20} /></button>
                </div>
                <div className="lf-modal-body">
                    <div className="lf-form-group">
                        <label>{t('contracts.fileName')}</label>
                        <input type="text" className="lf-input" value={editModal.fileName || ''} onChange={e => setEditModal({ ...editModal, fileName: e.target.value })} />
                    </div>
                    <div className="lf-form-group">
                        <label>{t('contracts.propertyAddress')}</label>
                        <input type="text" className="lf-input" value={editModal.propertyAddress || ''} onChange={e => setEditModal({ ...editModal, propertyAddress: e.target.value })} />
                    </div>
                    <div className="lf-form-group">
                        <label>{t('contracts.landlordName')}</label>
                        <input type="text" className="lf-input" value={editModal.landlordName || ''} onChange={e => setEditModal({ ...editModal, landlordName: e.target.value })} />
                    </div>
                </div>
                <div className="lf-modal-footer">
                    <button type="button" className="lf-btn-primary" onClick={saveEdit} disabled={isSaving}>
                        <Check size={16} /> {isSaving ? t('contracts.saving') : t('contracts.save')}
                    </button>
                    <button type="button" className="lf-btn-cancel" onClick={() => setEditModal(null)}>{t('contracts.cancel')}</button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default EditContractModal;