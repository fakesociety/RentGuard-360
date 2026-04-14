/**
 * ============================================
 *  SharedContractPage
 *  Public read-only view for shared contracts
 * ============================================
 * 
 * STRUCTURE:
 * - Uses public token to load contract
 * - Renders ContractView in read-only mode
 * - Handles invalid/expired tokens
 * 
 * DEPENDENCIES:
 * - api (getSharedAnalysis)
 * - ContractView
 * ============================================
 */
import React, { useRef } from 'react';
import { useParams } from 'react-router-dom';
import ContractView from '@/features/analysis/components/ContractView';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';
import { useSharedAnalysis } from '@/features/analysis/hooks/useSharedAnalysis';
import { SharedHero } from '@/features/analysis/components/SharedHero';
import { SharedLoadingState, SharedErrorState, SharedWarningState } from '@/features/analysis/components/SharedStates';
import './SharedContractPage.css';

const SharedContractPage = () => {
    const { isRTL } = useLanguage();
    const { id } = useParams();
    const contractViewRef = useRef(null);

    const {
        isLoading,
        error,
        fetchSharedAnalysis,
        isContract,
        contractText,
        clauses,
        sharedEditedClauses
    } = useSharedAnalysis(id);

    if (isLoading) {
        return (
            <div className="shared-contract-shell" dir={isRTL ? 'rtl' : 'ltr'}>
                <SharedLoadingState />
            </div>
        );
    }

    if (error) {
        return (
            <div className="shared-contract-shell" dir={isRTL ? 'rtl' : 'ltr'}>
                <SharedErrorState error={error} onRetry={fetchSharedAnalysis} />
            </div>
        );
    }

    return (
        <div className="shared-contract-shell" dir={isRTL ? 'rtl' : 'ltr'}>
            <SharedHero contractViewRef={contractViewRef} />

            <main className="shared-contract-content">
                {!isContract ? (
                    <SharedWarningState />
                ) : (
                    <section className="shared-contract-stage">
                        <ContractView
                            ref={contractViewRef}
                            contractText={contractText}
                            backendClauses={clauses}
                            issues={[]}
                            initialEditedClauses={sharedEditedClauses}
                            contractId={null}
                            readOnly={true}
                        />
                    </section>
                )}
            </main>
        </div>
    );
};

export default SharedContractPage;

