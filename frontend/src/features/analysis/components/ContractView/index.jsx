/**
 * ============================================
 * ContractView
 * Virtual PDF Contract Display & Editor (LexisFlow Modern UI)
 * ============================================
 */
import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { 
    ArrowDown, 
    ArrowUp,
    AlertTriangle,
    X,
    Maximize2,
    Minimize2,
    PartyPopper
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';
import ContractViewSignatures from './ContractViewSignatures';
import EditClauseModal from './EditClauseModal';
import ClauseRow from './ClauseRow';
import ContractToolbar from './ContractToolbar';
import { useContractEditor } from '../../hooks/useContractEditor';
import './ContractView.css';

const ContractView = forwardRef(({
    contractText = '',
    backendClauses = [],
    issues = [],
    readOnly = false,
    initialEditedClauses = {},
    contractId = null,
    onClauseChange,
    onSaveToCloud,
    onEditStateChange,
    onEditedClausesChange,
}, ref) => {
    const { t, isRTL } = useLanguage();
    
    const {
        editedClauses,
        updateEditedClauses,
        saveStatus,
        setSaveStatus,
        selectedClause,
        setSelectedClause,
        editingText,
        setEditingText,
        confirmRevertId,
        setConfirmRevertId,
        showClearAllConfirm,
        setShowClearAllConfirm,
        consultingClauseId,
        clauseExplanations,
        expandedExplanations,
        consultError,
        setConsultError,
        clauses,
        getClauseText,
        openEditor,
        closeEditor,
        requestRevert,
        confirmRevert,
        cancelRevert,
        saveEdit,
        applySuggestedFix,
        handleConsultClause,
        toggleExplanation,
        handleExport,
        handleGetDocxBlob,
        getCurrentEditedPayload,
        stats
    } = useContractEditor({
        contractText,
        backendClauses,
        issues,
        readOnly,
        initialEditedClauses,
        contractId,
        onClauseChange,
        onSaveToCloud,
        onEditStateChange,
        onEditedClausesChange,
    });

    const [showOnlyIssues, setShowOnlyIssues] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);

    const containerRef = useRef(null);
    const bottomRef = useRef(null);
    const [showScrollUp, setShowScrollUp] = useState(false);

    useEffect(() => {
        const handleScroll = (e) => {
            if (containerRef.current) {
                setShowScrollUp(containerRef.current.scrollTop > 200);
            } else {
                setShowScrollUp(window.scrollY > 200);
            }
        };

        // Attach global document scroll with capture perfectly tracks ALL scrolling elements
        document.addEventListener('scroll', handleScroll, { passive: true, capture: true });
        
        // Initial setup
        handleScroll();
        
        return () => {
            document.removeEventListener('scroll', handleScroll, { capture: true });
        };
    }, []);

    const scrollToBottom = () => bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });

    const scrollToTop = () => {
        // Scroll the actual contract wrapper to the top
        if (containerRef.current) {
            containerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
        
        // Also scroll the window to the top
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Scroll the main container if it exists
        const mainScrollContainer = document.querySelector('main, .app-main, .lf-cv-container');
        if (mainScrollContainer) {
            mainScrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const filteredClauses = showOnlyIssues ? clauses.filter(c => c.hasIssue) : clauses;

    useImperativeHandle(ref, () => ({
        handleExport,
        handleGetDocxBlob,
        getCurrentEditedPayload,
        requestClearAll: () => setShowClearAllConfirm(true),
    }), [handleExport, handleGetDocxBlob, getCurrentEditedPayload, setShowClearAllConfirm]);

    return (
        <div className="lf-cv-container" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="lf-cv-actions no-print">
                <button 
                    className="lf-cv-minimize-btn" 
                    onClick={() => setIsMinimized(!isMinimized)}
                    title={isMinimized ? t('contractView.expand') : t('contractView.collapse')}
                >
                    {isMinimized ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
                    <span>{isMinimized ? t('contractView.expand') : t('contractView.collapse')}</span>
                </button>
            </div>

            <div className={`lf-cv-paper ${isMinimized ? 'minimized' : ''}`} ref={containerRef}>

                {/* ===== HEADER ===== */}
                <header className="lf-cv-header">
                    <h1>{t('contractView.contractTitle')}</h1>
                    <p>{t('contractView.contractSubtitle')}</p>
                </header>

                {!isMinimized && (
                    <>
                        {/* ===== TOOLBAR ===== */}
                        <ContractToolbar 
                            readOnly={readOnly}
                            showOnlyIssues={showOnlyIssues}
                            setShowOnlyIssues={setShowOnlyIssues}
                            t={t}
                            stats={stats}
                        />

                        {/* ===== CLAUSES LIST ===== */}
                        <div className="lf-cv-clauses-list">
                            {filteredClauses.length === 0 ? (
                                <div className="lf-cv-no-clauses">
                                    {showOnlyIssues ? (
                                        <div className="lf-cv-no-issues-msg">
                                            <PartyPopper size={24} /> 
                                            <span>{t('contractView.noIssuesFound')}</span>
                                        </div>
                                    ) : t('contractView.noTextFound')}
                                </div>
                            ) : (
                                filteredClauses.map((clause) => (
                                    <ClauseRow
                                        key={clause.id}
                                        clause={clause}
                                        readOnly={readOnly}
                                        t={t}
                                        getClauseText={getClauseText}
                                        clauseExplanations={clauseExplanations}
                                        consultingClauseId={consultingClauseId}
                                        handleConsultClause={handleConsultClause}
                                        expandedExplanations={expandedExplanations}
                                        toggleExplanation={toggleExplanation}
                                        editedClauses={editedClauses}
                                        updateEditedClauses={updateEditedClauses}
                                        onClauseChange={onClauseChange}
                                        requestRevert={requestRevert}
                                        openEditor={openEditor}
                                    />
                                ))
                            )}
                        </div>

                        {/* ===== SIGNATURE FOOTER ===== */}
                        <ContractViewSignatures t={t} />

                        <div ref={bottomRef}></div>

                        {/* Floating Scroll Button Wrapper inside Paper */}
                        <div className="lf-cv-scroll-fab-wrapper">
                            <button
                                className={`lf-cv-scroll-fab no-print ${showScrollUp ? 'at-bottom' : ''}`}
                                onClick={showScrollUp ? scrollToTop : scrollToBottom}
                                title={showScrollUp ? t('contractView.scrollUp') : t('contractView.scrollToSignatures')}
                            >
                                {showScrollUp ? <ArrowUp size={16} strokeWidth={2.4} /> : <ArrowDown size={16} strokeWidth={2.4} />}
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* ===== MODALS ===== */}

            {/* Edit Modal */}
            {!readOnly && selectedClause && (
                <EditClauseModal
                    t={t}
                    isRTL={isRTL}
                    selectedClause={selectedClause}
                    editingText={editingText}
                    setEditingText={setEditingText}
                    saveEdit={saveEdit}
                    requestRevert={requestRevert}
                    closeEditor={closeEditor}
                    applySuggestedFix={applySuggestedFix}
                />
            )}

            {/* Error Toast */}
            {!readOnly && consultError && (
                <div className="lf-cv-error-toast no-print">
                    <AlertTriangle size={16} />
                    <span>{consultError}</span>
                    <button onClick={() => setConsultError(null)}><X size={16} /></button>
                </div>
            )}

            {/* Revert Confirmation Modal */}
            {!readOnly && confirmRevertId && (
                <div className="lf-cv-modal-overlay" onClick={cancelRevert}>
                    <div className="lf-cv-modal-content small-modal" onClick={e => e.stopPropagation()}>
                        <div className="lf-cv-modal-header warning">
                            <h3><AlertTriangle size={20} /> {t('contractView.confirmRevertTitle')}</h3>
                        </div>
                        <div className="lf-cv-modal-body center-text">
                            <p>{t('contractView.confirmRevertMessage')}</p>
                        </div>
                        <div className="lf-cv-modal-footer center-footer">
                            <button className="lf-cv-btn-revert" onClick={confirmRevert}>{t('contractView.confirmRevertYes')}</button>
                            <button className="lf-cv-btn-cancel" onClick={cancelRevert}>{t('contractView.confirmRevertNo')}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Clear All Confirmation Modal */}
            {!readOnly && showClearAllConfirm && (
                <div className="lf-cv-modal-overlay" onClick={() => setShowClearAllConfirm(false)}>
                    <div className="lf-cv-modal-content small-modal" onClick={e => e.stopPropagation()}>
                        <div className="lf-cv-modal-header warning">
                            <h3><AlertTriangle size={20} /> {t('contractView.clearAllTitle')}</h3>
                        </div>
                        <div className="lf-cv-modal-body center-text">
                            <p>
                                {t('contractView.clearAllMessage')}<br/>
                                <strong className="lf-cv-text-danger">{t('contractView.irreversibleWarning')}</strong>
                            </p>
                        </div>
                        <div className="lf-cv-modal-footer center-footer">
                            <button className="lf-cv-btn-revert" onClick={() => {
                                updateEditedClauses({});
                                onClauseChange?.(null, '', 'cleared');
                                if (contractId) localStorage.removeItem(`rentguard_edits_${contractId}`);
                                setSaveStatus(null);
                                setShowClearAllConfirm(false);
                            }}>
                                {t('contractView.clearAllYes')}
                            </button>
                            <button className="lf-cv-btn-cancel" onClick={() => setShowClearAllConfirm(false)}>
                                {t('contractView.cancel')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

ContractView.displayName = 'ContractView';

export default ContractView;
