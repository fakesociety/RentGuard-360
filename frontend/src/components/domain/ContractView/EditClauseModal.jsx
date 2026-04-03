import React from 'react';
import { Edit3, X, Sparkles, Check, Undo2 } from 'lucide-react';

const EditClauseModal = ({
    t,
    selectedClause,
    editingText,
    setEditingText,
    saveEdit,
    requestRevert,
    closeEditor,
    applySuggestedFix
}) => {
    if (!selectedClause) return null;

    return (
        <div className="lf-cv-modal-overlay" onClick={closeEditor}>
            <div className="lf-cv-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="lf-cv-modal-header">
                    <h3><Edit3 size={20} /> {t('contractView.editClause')}</h3>
                    <button className="lf-cv-modal-close" onClick={closeEditor}><X size={20} /></button>
                </div>

                <div className="lf-cv-modal-body" dir="rtl">
                    <div className="lf-cv-modal-section">
                        <label>{t('contractView.originalClauseLabel')}</label>
                        <div className="lf-cv-original-text">{selectedClause.text}</div>
                    </div>

                    {selectedClause.issue?.suggested_fix && (
                        <div className="lf-cv-modal-section lf-cv-suggested-section">
                            <div className="lf-cv-suggested-header">
                                <Sparkles size={16} /> <label>{t('contractView.aiFixSuggestionLabel')}</label>
                            </div>
                            <div className="lf-cv-suggested-text">{selectedClause.issue.suggested_fix}</div>
                            <button className="lf-cv-apply-btn" onClick={applySuggestedFix}>
                                <Check size={16} /> {t('contractView.applySuggestion')}
                            </button>
                        </div>
                    )}

                    <div className="lf-cv-modal-section">
                        <label>{t('contractView.editLabel')}</label>
                        <textarea
                            className="lf-cv-textarea"
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            dir="rtl"
                            rows={6}
                            placeholder={t('contractView.editPlaceholder')}
                        />
                    </div>
                </div>

                <div className="lf-cv-modal-footer">
                    <button className="lf-cv-btn-primary" onClick={saveEdit}>
                        <Check size={16} /> {t('contractView.finishEditing')}
                    </button>

                    {selectedClause.isEdited && (
                        <button className="lf-cv-btn-revert" onClick={(e) => requestRevert(selectedClause.id, e)}>
                            <Undo2 size={16} /> {t('contractView.revertToOriginal')}
                        </button>
                    )}

                    <button className="lf-cv-btn-cancel" onClick={closeEditor}>
                        {t('contractView.cancel')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditClauseModal;
