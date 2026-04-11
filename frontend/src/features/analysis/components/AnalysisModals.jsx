/**
 * ============================================
 *  AnalysisModals Component
 *  Dialogs for the analysis page (Edit, Delete, Export)
 * ============================================
 * 
 * STRUCTURE:
 * - Confirmation dialogues
 * - Document export forms
 * 
 * DEPENDENCIES:
 * - None
 * ============================================
 */
import React from 'react';
import Accordion from '@/components/ui/Accordion';
import { Copy, Share2, ExternalLink, Trash2, ChevronDown } from 'lucide-react';

export const SharePanel = ({
    result,
    isShareAccordionOpen,
    setIsShareAccordionOpen,
    shareLink,
    isSharePanelVisible,
    handleCopyShareLink,
    isGeneratingShareLink,
    sharePanelRef,
    getShareExpiryLabel,
    handleManualCopyShareLink,
    handleShareLinkViaApps,
    isSharingLink,
    handleRevokeShareLink,
    isRevokingShareLink,
    t
}) => {
    if (result?.is_contract === false) return null;

    return (
        <Accordion 
            className="lf-share-accordion"
            dir={t('dir', 'ltr')}
            title={t('analysis.secureShareLink')}
            icon={<Share2 size={16} />}
            isExpanded={isShareAccordionOpen}
            onToggle={setIsShareAccordionOpen}
            contentClassName="lf-share-accordion-inner"
        >
            {!shareLink || !isSharePanelVisible ? (
                        <button className="lf-action-btn" onClick={handleCopyShareLink} disabled={isGeneratingShareLink}>
                            <Share2 size={16} />
                            <span>{isGeneratingShareLink ? t('analysis.shareButtonCreating') : t('analysis.shareButtonCreate')}</span>
                        </button>
                    ) : (
                        <div ref={sharePanelRef} className="lf-share-panel mt-4">
                            <div className="lf-share-header">
                                <span>{t('analysis.secureShareLink')}</span>
                                <span className="lf-share-expiry">{getShareExpiryLabel()}</span>
                            </div>
                            <input type="text" readOnly value={shareLink} className="lf-share-input" onFocus={e => e.target.select()} />
                            <div className="lf-share-buttons">
                                <button className="lf-share-btn-icon" onClick={handleManualCopyShareLink} title={t('analysis.copyLink')}><Copy size={14}/></button>
                                <button className="lf-share-btn-icon" onClick={handleShareLinkViaApps} disabled={isSharingLink} title={t('analysis.shareViaApps')}><Share2 size={14}/></button>
                                <a className="lf-share-btn-icon" href={shareLink} target="_blank" rel="noreferrer" title={t('analysis.openLink')}><ExternalLink size={14}/></a>
                                <button className="lf-share-btn-icon danger" onClick={handleRevokeShareLink} disabled={isRevokingShareLink} title={t('analysis.revokeLink')}><Trash2 size={14}/></button>
                            </div>
                        </div>
                                    )}
        </Accordion>
    );
};
