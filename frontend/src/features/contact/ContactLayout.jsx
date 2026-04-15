/** Contact page layout - two-column grid with a form slot, contact details card, and embedded map. */
import React from 'react';
import { MapPin, Mail } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';
import MapComponent from '@/components/ui/MapComponent/MapComponent';

const ContactLayout = ({ children }) => {
    const { t, isRTL } = useLanguage();

    return (
        <div className="contact-page page-container" dir={isRTL ? 'rtl' : 'ltr'}>
            {/* Header Section */}
            <div className="contact-header ">
                <div className="page-header-content">
                    <h1 className="headline-font">
                        {t('contact.title')}
                    </h1>
                    <p>
                        {t('contact.subtitle')}
                    </p>
                </div>
            </div>

            {/* Main Layout Grid */}
            <div className="contact-grid">

                {/* Left/Right Column: Contact Form */}
                <div className="contact-form-column ">
                    {children}
                </div>

                {/* Left/Right Column: Info & Branding */}
                <div className="contact-info-column ">

                    {/* Contact Details Card */}
                    <div className="info-details-card">
                        <h2 className="headline-font">{t('contact.contactDetails')}</h2>
                        <ul className="info-list">
                            <li>
                                <div className="info-icon">
                                    <MapPin size={20} />
                                </div>
                                <div className="info-text">
                                    <p className="info-label">{t('contact.address')}</p>
                                    <p className="info-value">{t('contact.addressValue')}</p>
                                </div>
                            </li>
                            <li>
                                <div className="info-icon">
                                    <Mail size={20} />
                                </div>
                                <div className="info-text">
                                    <p className="info-label">{t('contact.emailLabel')}</p>
                                    <p className="info-value" dir="ltr">{t('contact.emailValue')}</p>
                                </div>
                            </li>
                        </ul>
                    </div>

                    {/* Map Component Branding Box */}
                    <div className="brand-image-card" style={{ height: 'auto', background: 'transparent' }}>
                        <MapComponent latitude={32.0853} longitude={34.7818} popupText={t('contact.mapPopupText')} />
                        <div style={{ marginTop: '1rem', textAlign: 'center', opacity: 0.8 }}>
                            <p>
                                {t('contact.joinText')}
                            </p>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default ContactLayout;