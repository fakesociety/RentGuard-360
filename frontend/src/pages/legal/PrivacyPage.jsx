import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';
import LegalDocumentLayout from '@/components/layout/LegalDocument/LegalDocumentLayout';
import { Info, ShieldCheck, Database, Share2, Cpu, Lock, Cookie, UserCheck } from 'lucide-react';

const PrivacyPage = () => {
    const { translations } = useLanguage();
    const data = translations.privacy;
    const icons = [Info, ShieldCheck, Database, Share2, Cpu, Lock, Cookie, UserCheck];

    return <LegalDocumentLayout data={data} icons={icons} />;
};

export default PrivacyPage;