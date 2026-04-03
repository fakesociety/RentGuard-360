import React from 'react';
import ScoreBreakdown from '../../../components/domain/ScoreBreakdown';
import ScoreMethodology from '../../../components/domain/ScoreMethodology';

const AnalysisSidebar = ({
    riskScore,
    scoreBreakdown,
    issues,
    ShareComponent
}) => {
    return (
        <aside className="lf-sidebar-column no-print">
            
            {ShareComponent}

            {/* Existing Score Breakdown & Methodology */}
            <div className="lf-existing-components">
                <ScoreBreakdown overallScore={riskScore} breakdown={scoreBreakdown} issues={issues} />
                <ScoreMethodology alwaysOpen={true} /> 
            </div>

        </aside>
    );
};

export default AnalysisSidebar;
