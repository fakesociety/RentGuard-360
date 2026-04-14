import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';
import LegalDocumentLayout from '@/components/layout/LegalDocument/LegalDocumentLayout';
import { Info, Gavel, CreditCard, Shield, AlertTriangle, XCircle } from 'lucide-react';

const TermsPage = () => {
    const { translations } = useLanguage();
    const data = translations.terms;
    const icons = [Info, Gavel, CreditCard, Shield, AlertTriangle, XCircle];

    return <LegalDocumentLayout data={data} icons={icons} />;
};

export default TermsPage;