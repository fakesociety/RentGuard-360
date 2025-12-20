import React, { createContext, useContext, useState, useEffect } from 'react';

// Translations object
const translations = {
    he: {
        // Navigation
        nav: {
            dashboard: 'לוח בקרה',
            upload: 'העלאה',
            contracts: 'חוזים',
            settings: 'הגדרות',
            contact: 'צור קשר',
            logout: 'התנתקות',
        },
        // Auth (Login/Register)
        auth: {
            login: 'התחברות',
            register: 'הרשמה',
            email: 'אימייל',
            password: 'סיסמה',
            fullName: 'שם מלא',
            passwordHint: 'לפחות 8 תווים, אות גדולה ומספר',
            loginButton: 'התחברות',
            registerButton: 'יצירת חשבון',
            noAccount: 'אין לך חשבון?',
            hasAccount: 'יש לך כבר חשבון?',
            confirmTitle: 'אימות אימייל',
            confirmMessage: 'שלחנו קוד לכתובת',
            confirmCode: 'קוד אימות',
            confirmButton: 'אימות',
            // Landing page content
            heroTitle: 'ניתוח חוזי שכירות בבינה מלאכותית',
            heroSubtitle: 'העלו את חוזה השכירות שלכם וקבלו ניתוח מפורט של:',
            heroBenefit1: 'סעיפים בעייתיים וסיכונים משפטיים',
            heroBenefit2: 'ציון סיכון כולל (0-100)',
            heroBenefit3: 'טיפים למשא ומתן',
            heroFeatures: 'עברית מלאה 🇮🇱 | ניתוח תוך 60 שניות ⚡ | פרטיות מלאה 🔒',
            // Benefits carousel
            benefitCloud: 'מבוסס ענן AWS',
            benefitCloudDesc: 'תשתית ברמה ארגונית עם זמינות של 99.99%. המסמכים שלך מעובדים בבטחה בענן.',
            benefitAI: 'בינה מלאכותית מתקדמת',
            benefitAIDesc: 'מופעל על ידי Amazon Bedrock - אחת ממערכות ה-AI החכמות ביותר הקיימות היום.',
            benefitSecurity: 'אבטחה ברמת בנק',
            benefitSecurityDesc: 'הצפנה מקצה לקצה. המידע האישי שלך מוסתר אוטומטית לפני ניתוח ה-AI. אפס שמירת מידע.',
            benefitFast: 'ניתוח מיידי',
            benefitFastDesc: 'קבל סקירה מקיפה של החוזה תוך פחות מ-60 שניות. ללא המתנה, ללא תורים.',
            // Demo steps
            demoTitle: 'איך זה עובד?',
            demoStep1: 'העלאת PDF',
            demoStep1Desc: 'העלו את חוזה השכירות שלכם בפורמט PDF. אנחנו תומכים בעברית ואנגלית.',
            demoStep2: 'ניתוח AI',
            demoStep2Desc: 'ה-AI שלנו סורק סיכונים, תנאים לא הוגנים ובעיות משפטיות.',
            demoStep3: 'קבלת תוצאות',
            demoStep3Desc: 'צפו בציון הסיכון, הסברים לבעיות וטיפים למשא ומתן.',
            // Features
            featureAI: '🤖 ניתוח AI',
            featureAIDesc: 'מופעל על ידי Amazon Bedrock לניתוח חוזים כמו מומחה משפטי',
            featurePrivacy: '🔒 פרטיות במקום ראשון',
            featurePrivacyDesc: 'מידע אישי (ת.ז., טלפון, אימייל) מוסתר אוטומטית לפני הניתוח',
            featureTips: '💡 טיפים חכמים',
            featureTipsDesc: 'קבלו עצות ספציפיות למשא ומתן על כל סעיף בעייתי',
            // Footer
            builtBy: 'נבנה עם ❤️ על ידי',
            projectName: 'פרויקט גמר מחשוב ענן',
        },
        // Dashboard
        dashboard: {
            greeting: {
                morning: 'בוקר טוב',
                afternoon: 'צהריים טובים',
                evening: 'ערב טוב',
            },
            totalContracts: 'סה"כ חוזים',
            analyzed: 'נותחו',
            pending: 'ממתינים',
            highRisk: 'סיכון גבוה',
            uploadContract: 'העלאת חוזה',
            uploadDescription: 'העלו חוזה שכירות חדש לניתוח AI',
            uploadPDF: 'העלאת PDF',
            viewContracts: 'צפייה בחוזים',
            viewDescription: 'עיינו בכל החוזים שהעליתם',
            viewAll: 'צפייה בכולם',
            howToStart: 'איך מתחילים',
            step1Title: 'העלאת חוזה',
            step1Desc: 'גררו ושחררו את חוזה השכירות בפורמט PDF',
            step2Title: 'ניתוח AI',
            step2Desc: 'ה-AI שלנו ינתח את תנאי החוזה (30-60 שניות)',
            step3Title: 'קבלת תובנות',
            step3Desc: 'צפו בסיכונים והצעות למשא ומתן',
            whyUs: 'למה דווקא RentGuard 360?',
            whyUsSubtitle: 'לא סתם עוד צ\'אט בוט - מערכת מקצועית שנבנתה במיוחד לניתוח חוזי שכירות',
            featurePrivacy: 'הגנה על הפרטיות',
            featurePrivacyDesc: 'המערכת מזהה ומצנזרת אוטומטית מידע אישי (ת.ז., טלפון, כתובת) לפני שליחה ל-AI. הפרטים שלכם נשארים פרטיים.',
            featurePrompt: 'פרומפט מקצועי מותאם',
            featurePromptDesc: 'בניגוד לשליחה לצ\'אט רגיל, המערכת שלנו משתמשת בפרומפט מיוחד שמנתח 70+ גורמי סיכון על פי חוק השכירות הישראלי.',
            featureScore: 'ציון סיכון מבוסס נתונים',
            featureScoreDesc: 'מקבלים ציון אובייקטיבי 0-100 עם פירוט לפי קטגוריות: תנאים כספיים, זכויות הדייר, אחריות ותיקונים ועוד.',
            featureTips: 'טיפים למשא ומתן',
            featureTipsDesc: 'לא רק מזהים בעיות - מקבלים הצעות קונקרטיות לתיקון סעיפים בעייתיים שתוכלו להציג לבעל הדירה.',
            featureAws: 'תשתית ענן מאובטחת',
            featureAwsDesc: 'רץ על AWS עם הצפנה מקצה לקצה. החוזים שלכם לא נשמרים ונמחקים אוטומטית לאחר הניתוח.',
        },
        // Contracts Page
        contracts: {
            title: 'החוזים שלי',
            subtitle: 'ניהול וצפייה בכל חוזי השכירות שלך',
            refresh: 'רענון',
            uploadContract: 'העלאת חוזה',
            noContracts: 'אין חוזים עדיין',
            noContractsDesc: 'העלו את חוזה השכירות הראשון שלכם לניתוח',
            uploadFirst: 'העלאת חוזה ראשון',
            deleteTitle: 'מחיקת חוזה',
            deleteConfirm: 'האם אתה בטוח שברצונך למחוק חוזה זה? פעולה זו לא ניתנת לביטול.',
            cancel: 'ביטול',
            delete: 'מחיקה',
            deleting: 'מוחק...',
            editTitle: 'עריכת פרטים',
            fileName: 'שם קובץ',
            propertyAddress: 'כתובת הנכס',
            landlordName: 'שם המשכיר',
            save: 'שמירה',
            saving: 'שומר...',
            loading: 'טוען חוזים...',
            lowRisk: 'סיכון נמוך',
            lowMediumRisk: 'סיכון נמוך-בינוני',
            mediumRisk: 'סיכון בינוני',
            highRisk: 'סיכון גבוה',
            analyzed: 'הושלם',
            pendingAnalysis: 'ממתין',
            notSpecified: 'לא צוין',
            exportWord: 'ייצוא Word',
            exportPDF: 'ייצוא PDF',
            viewAnalysis: 'צפייה בניתוח',
            sortBy: 'מיון לפי:',
            sortDate: 'תאריך',
            sortScore: 'ציון סיכון',
        },
        // Upload Page
        upload: {
            title: 'העלאת חוזה',
            subtitle: 'העלו את חוזה השכירות שלכם לניתוח AI',
            dragDrop: 'שחררו את ה-PDF כאן',
            or: 'או לחצו לבחירת קובץ',
            selectFile: 'בחירת קבצים',
            maxSize: 'גודל מקסימלי: 25MB | PDF בלבד',
            termsLabel: 'אני מאשר/ת שקראתי והבנתי את',
            termsLink: 'תנאי השימוש ומדיניות הפרטיות',
            uploadBtn: 'העלאת חוזה לניתוח',
            uploading: 'מעלה...',
            complete: 'הושלם!',
            uploadSuccess: 'ההעלאה הצליחה!',
            analyzing: 'ה-AI מנתח את החוזה שלכם (30-60 שניות)...',
            uploadedToServer: '✓ החוזה הועלה לשרת',
            analysisStarted: '✓ הניתוח התחיל',
            viewMyContracts: 'צפייה בחוזים שלי',
            uploadAnother: 'העלאת חוזה נוסף',
            contractDetails: 'פרטי החוזה (אופציונלי)',
            propertyAddress: 'כתובת הנכס',
            addressPlaceholder: 'רחוב ראשי 123, עיר',
            landlordName: 'שם המשכיר',
            landlordPlaceholder: 'ישראל ישראלי',
            contractName: 'שם החוזה',
            termsTitle: 'תנאי שימוש ומדיניות פרטיות',
            terms1Title: '1. הסכמה לתנאים',
            terms1Content: 'בהעלאת מסמכים למערכת RentGuard 360, אתם מסכימים לתנאי השימוש הבאים:',
            terms2Title: '2. שימוש במידע',
            terms2Content: 'המסמכים שתעלו יעובדו באמצעות טכנולוגיית AI לצורך ניתוח חוזי שכירות. המידע ישמש אך ורק לצורך מתן השירות המבוקש.',
            terms3Title: '3. אבטחת מידע',
            terms3Content: 'אנו מתחייבים לשמור על המידע שלכם בהתאם לתקני אבטחה מחמירים. המסמכים מאוחסנים בצורה מוצפנת בשרתי AWS.',
            terms4Title: '4. שמירת מידע',
            terms4Content: 'המידע יישמר למשך הזמן הנדרש לספק את השירות ובהתאם לדרישות החוק.',
            terms5Title: '5. הגבלת אחריות',
            terms5Content: 'הניתוח המוצע על ידי המערכת הינו לצורכי מידע בלבד ואינו מהווה ייעוץ משפטי. מומלץ להתייעץ עם עורך דין לפני חתימה על חוזה.',
            terms6Title: '6. זכויות המשתמש',
            terms6Content: 'באפשרותכם לבקש מחיקת המידע שלכם בכל עת באמצעות פנייה לתמיכה.',
            iAgree: 'קראתי ואני מסכים/ה',
            close: 'סגור',
            pdfOnly: 'רק קבצי PDF מותרים',
            fileTooLarge: 'גודל הקובץ חייב להיות פחות מ-25MB',
            uploadFailed: 'ההעלאה נכשלה. נסו שוב.',
        },
        // Analysis Page
        analysis: {
            title: 'ניתוח חוזה',
            backToContracts: 'חזרה לחוזים',
            summary: 'סיכום',
            scoreBreakdown: 'פירוט הציון',
            refresh: 'רענון',
            export: 'ייצוא',
            issues: 'בעיות שזוהו',
            noIssues: 'לא נמצאו בעיות בחוזה זה',
            original: 'מקור',
            problem: 'הבעיה',
            recommendation: 'המלצה',
            copyFix: 'העתק תיקון',
            copied: 'הועתק!',
            askAI: 'שאל את ה-AI',
            loading: 'טוען ניתוח...',
            analyzing: 'מנתח את החוזה...',
            notContract: 'מסמך זה לא נראה כחוזה שכירות',
        },
        // Score Breakdown
        score: {
            lowRisk: 'סיכון נמוך',
            lowMediumRisk: 'סיכון נמוך-בינוני',
            mediumRisk: 'סיכון בינוני',
            mediumHighRisk: 'סיכון בינוני-גבוה',
            highRisk: 'סיכון גבוה',
            financialTerms: 'תנאים כספיים',
            tenantRights: 'זכויות הדייר',
            terminationClauses: 'סיום ויציאה',
            liabilityRepairs: 'אחריות ותיקונים',
            legalCompliance: 'עמידה בחוק',
        },
        // Footer
        footer: {
            tagline: 'פלטפורמת ניתוח חוזי שכירות בבינה מלאכותית',
            builtWith: 'נבנה עם ❤️ על ידי',
            copyright: '© {year} RentGuard 360. פרויקט גמר מחשוב ענן.',
        },
        // Common
        common: {
            loading: 'טוען...',
            error: 'שגיאה',
            success: 'הצלחה',
            user: 'משתמש',
        },
    },
    en: {
        // Navigation
        nav: {
            dashboard: 'Dashboard',
            upload: 'Upload',
            contracts: 'Contracts',
            settings: 'Settings',
            contact: 'Contact',
            logout: 'Logout',
        },
        // Auth (Login/Register)
        auth: {
            login: 'Login',
            register: 'Sign Up',
            email: 'Email',
            password: 'Password',
            fullName: 'Full Name',
            passwordHint: 'At least 8 characters, uppercase and number',
            loginButton: 'Login',
            registerButton: 'Create Account',
            noAccount: "Don't have an account?",
            hasAccount: 'Already have an account?',
            confirmTitle: 'Email Verification',
            confirmMessage: 'We sent a code to',
            confirmCode: 'Verification Code',
            confirmButton: 'Verify',
            // Landing page content
            heroTitle: 'AI-Powered Rental Contract Analysis',
            heroSubtitle: 'Upload your rental contract and get a detailed analysis of:',
            heroBenefit1: 'Problematic clauses and legal risks',
            heroBenefit2: 'Overall risk score (0-100)',
            heroBenefit3: 'Negotiation tips',
            heroFeatures: 'Full Hebrew Support 🇮🇱 | Analysis in 60 seconds ⚡ | Full Privacy 🔒',
            // Benefits carousel
            benefitCloud: 'AWS Cloud-Based',
            benefitCloudDesc: 'Enterprise-grade infrastructure with 99.99% availability. Your documents are processed securely in the cloud.',
            benefitAI: 'Advanced AI',
            benefitAIDesc: 'Powered by Amazon Bedrock - one of the most intelligent AI systems available today.',
            benefitSecurity: 'Bank-Level Security',
            benefitSecurityDesc: 'End-to-end encryption. Your personal data is automatically masked before AI analysis. Zero data retention.',
            benefitFast: 'Instant Analysis',
            benefitFastDesc: 'Get a comprehensive contract review in less than 60 seconds. No waiting, no queues.',
            // Demo steps
            demoTitle: 'How it Works',
            demoStep1: 'Upload PDF',
            demoStep1Desc: 'Upload your rental contract in PDF format. We support Hebrew and English.',
            demoStep2: 'AI Analysis',
            demoStep2Desc: 'Our AI scans for risks, unfair terms, and legal issues.',
            demoStep3: 'Get Results',
            demoStep3Desc: 'View risk score, issue explanations, and negotiation tips.',
            // Features
            featureAI: '🤖 AI Analysis',
            featureAIDesc: 'Powered by Amazon Bedrock for contract analysis like a legal expert',
            featurePrivacy: '🔒 Privacy First',
            featurePrivacyDesc: 'Personal info (ID, phone, email) is automatically masked before analysis',
            featureTips: '💡 Smart Tips',
            featureTipsDesc: 'Get specific negotiation advice for each problematic clause',
            // Footer
            builtBy: 'Built with ❤️ by',
            projectName: 'Cloud Computing Final Project',
        },
        // Dashboard
        dashboard: {
            greeting: {
                morning: 'Good morning',
                afternoon: 'Good afternoon',
                evening: 'Good evening',
            },
            totalContracts: 'Total Contracts',
            analyzed: 'Analyzed',
            pending: 'Pending',
            highRisk: 'High Risk',
            uploadContract: 'Upload Contract',
            uploadDescription: 'Upload a new rental contract for AI analysis',
            uploadPDF: 'Upload PDF',
            viewContracts: 'View Contracts',
            viewDescription: 'Review all your uploaded contracts',
            viewAll: 'View All',
            howToStart: 'How to Start',
            step1Title: 'Upload Contract',
            step1Desc: 'Drag and drop your rental contract in PDF format',
            step2Title: 'AI Analysis',
            step2Desc: 'Our AI will analyze the contract terms (30-60 seconds)',
            step3Title: 'Get Insights',
            step3Desc: 'View risks and negotiation suggestions',
            whyUs: 'Why RentGuard 360?',
            whyUsSubtitle: 'Not just another chatbot - a professional system built specifically for rental contract analysis',
            featurePrivacy: 'Privacy Protection',
            featurePrivacyDesc: 'The system automatically detects and redacts personal information (ID, phone, address) before sending to AI. Your details stay private.',
            featurePrompt: 'Custom Professional Prompt',
            featurePromptDesc: 'Unlike sending to a regular chat, our system uses a specialized prompt that analyzes 70+ risk factors according to Israeli rental law.',
            featureScore: 'Data-Driven Risk Score',
            featureScoreDesc: 'Get an objective score 0-100 with breakdown by categories: financial terms, tenant rights, liability and repairs, and more.',
            featureTips: 'Negotiation Tips',
            featureTipsDesc: 'Not just identifying issues - get concrete suggestions for fixing problematic clauses that you can present to the landlord.',
            featureAws: 'Secure Cloud Infrastructure',
            featureAwsDesc: 'Runs on AWS with end-to-end encryption. Your contracts are not stored and are automatically deleted after analysis.',
        },
        // Contracts Page
        contracts: {
            title: 'My Contracts',
            subtitle: 'Manage and view all your rental contracts',
            refresh: 'Refresh',
            uploadContract: 'Upload Contract',
            noContracts: 'No contracts yet',
            noContractsDesc: 'Upload your first rental contract for analysis',
            uploadFirst: 'Upload First Contract',
            deleteTitle: 'Delete Contract',
            deleteConfirm: 'Are you sure you want to delete this contract? This action cannot be undone.',
            cancel: 'Cancel',
            delete: 'Delete',
            deleting: 'Deleting...',
            editTitle: 'Edit Details',
            fileName: 'File Name',
            propertyAddress: 'Property Address',
            landlordName: 'Landlord Name',
            save: 'Save',
            saving: 'Saving...',
            loading: 'Loading contracts...',
            lowRisk: 'Low Risk',
            lowMediumRisk: 'Low-Medium Risk',
            mediumRisk: 'Medium Risk',
            highRisk: 'High Risk',
            analyzed: 'Completed',
            pendingAnalysis: 'Pending',
            notSpecified: 'Not specified',
            exportWord: 'Export Word',
            exportPDF: 'Export PDF',
            viewAnalysis: 'View Analysis',
            sortBy: 'Sort by:',
            sortDate: 'Date',
            sortScore: 'Risk Score',
        },
        // Upload Page
        upload: {
            title: 'Upload Contract',
            subtitle: 'Upload your rental contract for AI analysis',
            dragDrop: 'Drop PDF here',
            or: 'or click to select file',
            selectFile: 'Select Files',
            maxSize: 'Max size: 25MB | PDF only',
            termsLabel: 'I confirm that I have read and understood the',
            termsLink: 'Terms of Service and Privacy Policy',
            uploadBtn: 'Upload Contract for Analysis',
            uploading: 'Uploading...',
            complete: 'Complete!',
            uploadSuccess: 'Upload Successful!',
            analyzing: 'AI is analyzing your contract (30-60 seconds)...',
            uploadedToServer: '✓ Contract uploaded to server',
            analysisStarted: '✓ Analysis started',
            viewMyContracts: 'View My Contracts',
            uploadAnother: 'Upload Another Contract',
            contractDetails: 'Contract Details (Optional)',
            propertyAddress: 'Property Address',
            addressPlaceholder: '123 Main Street, City',
            landlordName: 'Landlord Name',
            landlordPlaceholder: 'John Smith',
            contractName: 'Contract Name',
            termsTitle: 'Terms of Service and Privacy Policy',
            terms1Title: '1. Agreement to Terms',
            terms1Content: 'By uploading documents to RentGuard 360, you agree to the following terms of use:',
            terms2Title: '2. Use of Information',
            terms2Content: 'Documents you upload will be processed using AI technology for rental contract analysis. The information will be used solely to provide the requested service.',
            terms3Title: '3. Data Security',
            terms3Content: 'We are committed to protecting your information according to strict security standards. Documents are stored encrypted on AWS servers.',
            terms4Title: '4. Data Retention',
            terms4Content: 'Information will be retained for the time necessary to provide the service and in accordance with legal requirements.',
            terms5Title: '5. Limitation of Liability',
            terms5Content: 'The analysis provided by the system is for informational purposes only and does not constitute legal advice. It is recommended to consult with a lawyer before signing any contract.',
            terms6Title: '6. User Rights',
            terms6Content: 'You may request deletion of your data at any time by contacting support.',
            iAgree: 'I have read and agree',
            close: 'Close',
            pdfOnly: 'Only PDF files are allowed',
            fileTooLarge: 'File size must be less than 25MB',
            uploadFailed: 'Upload failed. Please try again.',
        },
        // Analysis Page
        analysis: {
            title: 'Contract Analysis',
            backToContracts: 'Back to Contracts',
            summary: 'Summary',
            scoreBreakdown: 'Score Breakdown',
            refresh: 'Refresh',
            export: 'Export',
            issues: 'Issues Found',
            noIssues: 'No issues found in this contract',
            original: 'Original',
            problem: 'Problem',
            recommendation: 'Recommendation',
            copyFix: 'Copy Fix',
            copied: 'Copied!',
            askAI: 'Ask AI',
            loading: 'Loading analysis...',
            analyzing: 'Analyzing contract...',
            notContract: 'This document does not appear to be a rental contract',
        },
        // Score Breakdown
        score: {
            lowRisk: 'Low Risk',
            lowMediumRisk: 'Low-Medium Risk',
            mediumRisk: 'Medium Risk',
            mediumHighRisk: 'Medium-High Risk',
            highRisk: 'High Risk',
            financialTerms: 'Financial Terms',
            tenantRights: 'Tenant Rights',
            terminationClauses: 'Termination & Exit',
            liabilityRepairs: 'Liability & Repairs',
            legalCompliance: 'Legal Compliance',
        },
        // Footer
        footer: {
            tagline: 'AI-Powered Rental Contract Analysis Platform',
            builtWith: 'Built with ❤️ by',
            copyright: '© {year} RentGuard 360. Cloud Computing Final Project.',
        },
        // Common
        common: {
            loading: 'Loading...',
            error: 'Error',
            success: 'Success',
            user: 'User',
        },
    },
};

// Create context
const LanguageContext = createContext();

// Provider component
export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState(() => {
        // Get saved language or default to Hebrew
        const saved = localStorage.getItem('rentguard-language');
        return saved || 'he';
    });

    useEffect(() => {
        // Save language preference
        localStorage.setItem('rentguard-language', language);
        // Update document direction
        document.documentElement.dir = language === 'he' ? 'rtl' : 'ltr';
        document.documentElement.lang = language;
    }, [language]);

    const t = (key) => {
        const keys = key.split('.');
        let value = translations[language];
        for (const k of keys) {
            value = value?.[k];
        }
        return value || key;
    };

    const toggleLanguage = () => {
        setLanguage(prev => prev === 'he' ? 'en' : 'he');
    };

    const isRTL = language === 'he';

    return (
        <LanguageContext.Provider value={{
            language,
            setLanguage,
            t,
            toggleLanguage,
            isRTL,
            translations: translations[language]
        }}>
            {children}
        </LanguageContext.Provider>
    );
};

// Custom hook
export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};

export default LanguageContext;
