import React, { useState } from 'react';
import { Mail, CheckCircle2, MapPin, Phone, Send, Shield, Clock, ArrowRight } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext/LanguageContext';
import { sendContactMessage } from '../../services/api';
import { emitAppToast } from '../../utils/toast';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import MapComponent from '../../components/ui/MapComponent';
import './ContactPage.css';
import { Link } from 'react-router-dom';

const ContactPublic = () => {
    const { t, isRTL } = useLanguage();
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        message: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState(null);
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');
        setSubmitStatus(null);

        try {
            const response = await sendContactMessage({
                ...formData,
                subject: t('contact.defaultSubject') || 'Public Contact'
            }, { isPublic: true });

            if (response.ticketId || response.message === 'Ticket created') {
                setSubmitStatus('success');
                setFormData({ name: '', email: '', phone: '', message: '' });
                emitAppToast({
                    type: 'success',
                    title: t('notifications.contactSentTitle'),
                    message: t('notifications.contactSentMessage'),
                });
            } else {
                throw new Error(response.error || 'Failed to send message');
            }
        } catch (err) {
            console.error('Contact public error:', err);
            setError(err.message || (isRTL ? 'שליחת ההודעה נכשלה. נסו שוב.' : 'Failed to send message. Please try again.'));
            setSubmitStatus('error');
            emitAppToast({
                type: 'error',
                title: t('notifications.contactFailedTitle'),
                message: err.message || t('notifications.contactFailedMessage'),
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="contact-page page-container" dir={isRTL ? 'rtl' : 'ltr'}>

            {/* Header Section */}
            <div className="contact-header animate-fadeIn">
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
                <div className="contact-form-column animate-slideUp">
                    <Card variant="elevated" padding="lg" className="contact-form-card">
                        {submitStatus === 'success' ? (
                            <div className="success-message" style={{ flexDirection: 'column', textAlign: 'center' }}>
                                <span className="success-icon" aria-hidden="true" style={{ marginBottom: '1rem' }}>
                                    <CheckCircle2 size={48} strokeWidth={2} />
                                </span>
                                <h3>{t('contact.successTitle')}</h3>
                                <p>{t('contact.successMessage')}</p>
                                <div className="public-cta-success-wrapper">
                                    <Button
                                        variant="secondary"
                                        onClick={() => setSubmitStatus(null)}
                                        style={{ width: 'fit-content' }}
                                    >
                                        {t('contact.sendAnother')}
                                    </Button>
                                    <Link to="/?auth=register" className="cta-btn public-cta-success-link">
                                        {t('contact.registerFreePlan')}
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="contact-form">
                                <div className="form-row-2col">
                                    <Input
                                        label={t('contact.fullName')}
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        required
                                        placeholder={t('contact.fullNamePlaceholder')}
                                    />
                                    <Input
                                        label={t('contact.phone')}
                                        name="phone"
                                        type="tel"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        dir="ltr"
                                        placeholder={t('contact.phonePlaceholder')}
                                    />
                                </div>

                                <Input
                                    label={t('contact.email')}
                                    name="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    dir="ltr"
                                    placeholder={t('contact.emailPlaceholder')}
                                />

                                <div className="textarea-wrapper">
                                    <label className="input-label">{t('contact.message')}</label>
                                    <textarea
                                        name="message"
                                        value={formData.message}
                                        onChange={handleChange}
                                        required
                                        placeholder={t('contact.messagePlaceholder')}
                                        rows={5}
                                        className="contact-textarea"
                                    />
                                </div>

                                {error && <p className="form-error">{error}</p>}

                                <Button
                                    variant="primary"
                                    fullWidth
                                    loading={isSubmitting}
                                    type="submit"
                                    className="submit-btn"
                                >
                                    <span>{isSubmitting ? t('contact.sending') : t('contact.sendMessage')}</span>
                                    {!isSubmitting && <Send size={18} className={isRTL ? 'icon-rtl' : 'icon-ltr'} />}
                                </Button>

                                <div className="trust-bar">
                                    <div className="trust-item">
                                        <Shield size={18} className="trust-icon" />
                                        <span>{t('contact.secureCommunication')}</span>
                                    </div>
                                    <div className="trust-item">
                                        <Clock size={18} className="trust-icon" />
                                        <span>{t('contact.fastResponse')}</span>
                                    </div>
                                </div>
                                
                                <div className="public-cta-wrapper">
                                    <p className="public-cta-title">
                                        {t('contact.notCustomerYet')}
                                    </p>
                                    <Link to="/?auth=register" className="public-cta-link">
                                        <span>{t('contact.registerNowFree')}</span>
                                        <ArrowRight size={18} className={isRTL ? 'icon-rtl' : 'icon-ltr'} />
                                    </Link>
                                </div>
                            </form>
                        )}
                    </Card>
                </div>

                {/* Left/Right Column: Info & Branding */}
                <div className="contact-info-column animate-slideUp" style={{ animationDelay: '100ms' }}>

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
                        <MapComponent latitude={32.0853} longitude={34.7818} popupText="RentGuard-360 TLV" />
                        <div style={{ marginTop: '1rem', textAlign: 'center', opacity: 0.8 }}>
                            <p>
                                {t('contact.joinText')}
                            </p>
                        </div>
                    </div>

                    {/* CTA was moved to the right column inside the form! */}

                </div>
            </div>
        </div>
    );
};

export default ContactPublic;
