import React from 'react';
import { AlertTriangle, Edit3 } from 'lucide-react';

const ContractToolbar = ({
    readOnly,
    showOnlyIssues,
    setShowOnlyIssues,
    t,
    stats
}) => {
    return (
        <div className="lf-cv-toolbar no-print">
            <div className="lf-cv-toolbar-left">
                {!readOnly && (
                    <label className="lf-cv-filter-toggle">
                        <input
                            type="checkbox"
                            checked={showOnlyIssues}
                            onChange={(e) => setShowOnlyIssues(e.target.checked)}
                        />
                        <span>{t('contractView.showOnlyProblemClauses')}</span>
                    </label>
                )}
            </div>
            <div className="lf-cv-toolbar-stats">
                <span className="lf-cv-stat-badge neutral">
                    {stats.total} {t('contractView.clausesCountSuffix')}
                </span>
                {stats.withIssues > 0 && (
                    <span className="lf-cv-stat-badge warning">
                        <AlertTriangle size={14} /> {stats.withIssues} {t('contractView.issuesCountSuffix')}
                    </span>
                )}
                {stats.edited > 0 && (
                    <span className="lf-cv-stat-badge success">
                        <Edit3 size={14} /> {stats.edited} {t('contractView.editedCountSuffix')}
                    </span>
                )}
            </div>
        </div>
    );
};

export default ContractToolbar;
