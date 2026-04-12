export const extractFixText = (issue) => {
    if (!issue) return null;
    return issue.suggested_fix || issue.recommendation || issue.suggestedFix || issue.solution || issue.fix || null;
};
