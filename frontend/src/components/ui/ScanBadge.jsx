import React from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { useLanguage } from '../../contexts/LanguageContext/LanguageContext';
import { Search } from 'lucide-react';

const ScanBadge = () => {
  const { isAdmin } = useAuth();
  const { scansRemaining, isUnlimited, hasSubscription } = useSubscription();
  const { t } = useLanguage();
  const navigate = useNavigate();

  if (!hasSubscription && !isAdmin) {
    return null;
  }

  return (
    <button
      className="scan-badge"
      onClick={() => navigate(isAdmin ? '/admin/stripe' : '/pricing')}
      title={(isAdmin || isUnlimited) ? t('nav.unlimited') : `${scansRemaining} ${t('nav.scansLeft')}`}
    >
      {(isAdmin || isUnlimited) ? (
        <span className="material-symbols-outlined" style={{ fontSize: '22px', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          all_inclusive
        </span>
      ) : (
        <>
          <Search size={18} />
          <span>{scansRemaining}</span>
        </>
      )}
    </button>
  );
};

export default ScanBadge;

ScanBadge.propTypes = {
  className: PropTypes.string
};

