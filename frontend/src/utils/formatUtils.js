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
};

export const USD_EXCHANGE_RATE = 3.7;

export const calculateDisplayPrice = (price, isRTL) => {
    const safePrice = Number(price) || 0;
    const displayPrice = !isRTL ? Math.round(safePrice / USD_EXCHANGE_RATE) : safePrice;
    const displayCurrency = !isRTL ? '$' : '₪';
    return { displayPrice, displayCurrency };
};


export const formatStripeAmount = (amount, currency, locale) => {
    let numericAmount = Number(amount || 0);
    const safeCurrency = (currency || 'ILS').toUpperCase();
    if (numericAmount !== 0 && Number.isInteger(numericAmount) && Math.abs(numericAmount) >= 100) {
        numericAmount = numericAmount / 100;
    }
    try {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: safeCurrency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(numericAmount);
    } catch {
        const symbol = safeCurrency === 'ILS' ? '₪' : '$';
        return `${symbol}${numericAmount.toFixed(2)}`;
    }
};

export const formatDateLocalized = (value, locale) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
    });
};

