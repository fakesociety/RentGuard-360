/**
 * ============================================
 *  EditClauseModal Component
 *  Modal window for manual clause editing
 * ============================================
 * 
 * STRUCTURE:
 * - Original text display
 * - AI fix suggestion preview (if available)
 * - Textarea for manual editing
 * - Action buttons (Save, Revert, Cancel)
 * 
 * DEPENDENCIES:
 * - None
 * ============================================
 */
import React from 'react';
import { Edit3, X, Sparkles, Check, Undo2 } from 'lucide-react';
import { extractFixText } from '../../utils/analysisUtils';
import './EditClauseModal.css';

const EditClauseModal = ({
    t,
    isRTL,
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
            <div
                className="lf-cv-modal-content"
                onClick={(e) => e.stopPropagation()}
                dir={isRTL ? 'rtl' : 'ltr'}
                role="dialog"
                aria-modal="true"
            >
                <div className="lf-cv-modal-header">
                    <h3><Edit3 size={20} /> {t('contractView.editClause')}</h3>
                    <button type="button" className="lf-cv-modal-close" onClick={closeEditor}><X size={20} /></button>
                </div>

                <div className="lf-cv-modal-body" dir="rtl">
                    <div className="lf-cv-modal-section">
                        <label>{t('contractView.originalClauseLabel')}</label>
                        <div className="lf-cv-original-text" dir="rtl">{selectedClause.text}</div>
                    </div>

                    {selectedClause.issues?.length > 0 && selectedClause.issues.map((issue, idx) => {
                        const fixText = extractFixText(issue);
                        if (!fixText) return null;
                        return (
                            <div key={idx} className="lf-cv-modal-section lf-cv-suggested-section">
                                <div className="lf-cv-suggested-header">
                                    <Sparkles size={16} /> <label>{t('contractView.aiFixSuggestionLabel')}</label>
                                </div>
                                <div className="lf-cv-suggested-text" dir="rtl">{fixText}</div>
                                <button type="button" className="lf-cv-apply-btn" onClick={() => applySuggestedFix(issue)}>
                                    <Check size={16} /> {t('contractView.applySuggestion')}
                                </button>
                            </div>
                        );
                    })}

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
                    <button type="button" className="lf-cv-btn-primary" onClick={saveEdit}>
                        <Check size={16} /> {t('contractView.finishEditing')}
                    </button>

                    {selectedClause.isEdited && (
                        <button type="button" className="lf-cv-btn-revert" onClick={(e) => requestRevert(selectedClause.id, e)}>
                            <Undo2 size={16} /> {t('contractView.revertToOriginal')}
                        </button>
                    )}

                    <button type="button" className="lf-cv-btn-cancel" onClick={closeEditor}>
                        {t('contractView.cancel')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditClauseModal;
