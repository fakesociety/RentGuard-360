export const getRiskTier = (score, t) => {
    if (score >= 86) return { class: 'excellent', label: t('contracts.lowRisk') };
    if (score >= 71) return { class: 'good', label: t('contracts.lowMediumRisk') };
    if (score >= 51) return { class: 'warning', label: t('contracts.mediumRisk') };
    return { class: 'danger', label: t('contracts.highRisk') };
};
