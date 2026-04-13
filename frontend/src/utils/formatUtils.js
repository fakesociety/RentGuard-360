export const formatMoney = (value, currency = 'USD', locale = 'en-US') => {
    const safe = Number(value || 0);
    try {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: String(currency || 'USD').toUpperCase(),
            maximumFractionDigits: 2,
        }).format(safe);
    } catch {
        return `${safe.toFixed(2)} ${String(currency || 'USD').toUpperCase()}`;
    }
};

export const shortUserId = (value) => {
    const text = String(value || '');
    if (text.length <= 12) return text;
    return `${text.slice(0, 6)}...${text.slice(-4)}`;
};

export const localizeBundleName = (key, raw, t) => {
    if (!key) return raw;
    const trans = t(`admin.package${key}`);
    return trans === `admin.package${key}` ? raw : trans;
};

export const formatTime = (seconds, t) => {
    if (!seconds) return '—';
    if (seconds < 60) return `${Math.round(seconds)} ${t('admin.seconds')}`;
    return `${Math.round(seconds / 60)} ${t('admin.minutes')}`;
};
