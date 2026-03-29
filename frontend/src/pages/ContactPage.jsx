/**
 * ============================================
 * ContactPage
 * Customer Support Contact Form
 * ============================================
 */
import React, { useState } from 'react';
import { Mail, CheckCircle2, MapPin, Phone, Send, Shield, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { sendContactMessage } from '../services/api';
import { emitAppToast } from '../utils/toast';
import Card from '../components/Card';
import Input from '../components/Input';
import Button from '../components/Button';
import './ContactPage.css';

const ContactPage = () => {
    const { userAttributes } = useAuth();
    const { t, isRTL } = useLanguage();
    const [formData, setFormData] = useState({
        name: userAttributes?.name || '',
        email: userAttributes?.email || '',
        phone: '', // Added phone field from the new design
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
                email: userAttributes?.email || formData.email,
                // Defaulting subject since it's removed from UI but might be needed by API
                subject: t('contact.defaultSubject')
            });

            if (response.ticketId || response.message === 'Ticket created') {
                setSubmitStatus('success');
                setFormData({ ...formData, phone: '', message: '' });
                emitAppToast({
                    type: 'success',
                    title: t('notifications.contactSentTitle'),
                    message: t('notifications.contactSentMessage'),
                });
            } else {
                throw new Error(response.error || 'Failed to send message');
            }
        } catch (err) {
            console.error('Contact form error:', err);
            setError(err.message || t('contact.errorMessage'));
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
                            <div className="success-message">
                                <span className="success-icon" aria-hidden="true">
                                    <CheckCircle2 size={48} strokeWidth={2} />
                                </span>
                                <h3>{t('contact.successTitle')}</h3>
                                <p>{t('contact.successMessage')}</p>
                                <Button
                                    variant="secondary"
                                    onClick={() => setSubmitStatus(null)}
                                >
                                    {t('contact.sendAnother')}
                                </Button>
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
                                    value={userAttributes?.email || formData.email}
                                    onChange={handleChange}
                                    disabled={!!userAttributes?.email}
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
                            <li>
                                <div className="info-icon">
                                    <Phone size={20} />
                                </div>
                                <div className="info-text">
                                    <p className="info-label">{t('contact.phoneLabel')}</p>
                                    <p className="info-value" dir="ltr">{t('contact.phoneValue')}</p>
                                </div>
                            </li>
                        </ul>
                    </div>

                    {/* Office Image Branding Box */}
                    <div className="brand-image-card">
                        <img
                            src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80"
                            alt="Office"
                            className="office-bg"
                        />
                        <div className="brand-image-overlay">
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

export default ContactPage;