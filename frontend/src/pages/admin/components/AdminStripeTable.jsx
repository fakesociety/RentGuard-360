import React from 'react';

export const AdminStripeTable = ({
    data,
    sql,
    derivedCurrencies,
    locale,
    t,
    formatMoney,
    shortUserId
}) => {
    return (
        <section className="stripe-panel table-panel">
            <div className="table-head">
                <h3>{t('admin.recentTransactions')}</h3>
                <span>{t('admin.generatedAt')}: {data?.generatedAt ? new Date(data.generatedAt).toLocaleString(locale) : 'N/A'}</span>
            </div>
            <div className="currency-summary">
                <h4>{t('admin.topCurrencies')}</h4>
                {derivedCurrencies.length > 0 ? (
                    <div className="currency-summary-list">
                        {derivedCurrencies.slice(0, 6).map((cur) => (
                            <div className="currency-summary-row" key={`currency-${cur.currency}`}>
                                <span>{String(cur.currency || '').toUpperCase()}</span>
                                <strong>{formatMoney(cur.amount, cur.currency, locale)}</strong>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="empty-text">{t('admin.noCurrencyAmounts')}</p>
                )}
            </div>
            <div className="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th>{t('common.user')}</th>
                            <th>{t('admin.bundle')}</th>
                            <th>{t('admin.amount')}</th>
                            <th>{t('admin.currency')}</th>
                            <th>{t('admin.status')}</th>
                            <th>{t('admin.updatedAt')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(sql.recentTransactions || []).map((tx, idx) => (
                            <tr key={`${tx.userId}-${tx.createdAt}-${idx}`}>
                                <td>{shortUserId(tx.userId)}</td>
                                <td>{tx.bundleName}</td>
                                <td>{Number(tx.amount || 0).toFixed(2)}</td>
                                <td>{String(tx.currency || '').toUpperCase()}</td>
                                <td>
                                    <span className={`status-pill ${String(tx.status || '').toLowerCase()}`}>
                                        {tx.status}
                                    </span>
                                </td>
                                <td>{tx.createdAt ? new Date(tx.createdAt).toLocaleString(locale) : '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {(!sql.recentTransactions || sql.recentTransactions.length === 0) && (
                    <p className="empty-text">{t('admin.noData')}</p>
                )}
            </div>
        </section>
    );
};
