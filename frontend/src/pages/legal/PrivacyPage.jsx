/** Privacy Policy page - wraps LegalDocumentLayout with Hebrew/English privacy policy content. */
import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';
import LegalDocumentLayout from '@/features/legal/LegalDocumentLayout';
import { Info, ShieldCheck, Database, Share2, Cpu, Lock, Cookie, UserCheck } from 'lucide-react';

const PrivacyPage = () => {
    const { translations } = useLanguage();
    const data = translations.privacy;
    const icons = [Info, ShieldCheck, Database, Share2, Cpu, Lock, Cookie, UserCheck];

    return <LegalDocumentLayout data={data} icons={icons} />;
};

export default PrivacyPage;