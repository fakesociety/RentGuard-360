import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Send, Shield, Clock, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';
import { sendContactMessage } from '@/services/apiClient';
import { emitAppToast } from '@/components/ui/toast/toast';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

const ContactForm = ({
    initialData = { name: '', email: '' },
    readOnlyFields = false,
    isPublic = false
}) => {
    const { t, isRTL } = useLanguage();
    const [formData, setFormData] = useState({
        name: initialData.name || '',
        email: initialData.email || '',
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
            // If form data has empty email, fallback to initialData (for auth payload fallback if disabled)
            const payloadEmail = formData.email || initialData.email;
            const reqOptions = isPublic ? { isPublic: true } : undefined;

            const response = await sendContactMessage({
                ...formData,
                email: payloadEmail,
                subject: t('contact.defaultSubject')
            }, reqOptions);

            if (response.ticketId || response.message === 'Ticket created') {
                setSubmitStatus('success');
                setFormData(prev => ({ ...prev, message: '' }));
                if (isPublic) {
                    setFormData({ name: '', email: '', message: '' });
                }
                emitAppToast({
                    type: 'success',
                    title: t('notifications.contactSentTitle'),
                    message: t('notifications.contactSentMessage'),
                });
            } else {
                throw new Error(response.error || t('notifications.contactFailedMessage') || 'Failed to send message');
            }
        } catch (err) {
            console.error('Contact form error:', err);
            setError(err.message || t('notifications.contactFailedMessage') || t('contact.errorMessage'));
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
        <Card variant="elevated" padding="lg" className="contact-form-card">
            {submitStatus === 'success' ? (
                <div 
                    className="success-message" 
                    style={isPublic ? { flexDirection: 'column', textAlign: 'center' } : {}}
                >
                    <span 
                        className="success-icon" 
                        aria-hidden="true" 
                        style={isPublic ? { marginBottom: '1rem' } : {}}
                    >
                        <CheckCircle2 size={48} strokeWidth={2} />
                    </span>
                    <h3>{t('contact.successTitle')}</h3>
                    <p>{t('contact.successMessage')}</p>
                    
                    {isPublic ? (
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
                    ) : (
                        <Button
                            variant="secondary"
                            onClick={() => setSubmitStatus(null)}
                        >
                            {t('contact.sendAnother')}
                        </Button>
                    )}
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="contact-form">
                    <Input
                        label={t('contact.fullName')}
                        name="name"
                        value={readOnlyFields && initialData.name ? initialData.name : formData.name}
                        onChange={handleChange}
                        disabled={readOnlyFields && !!initialData.name}
                        required
                        placeholder={t('contact.fullNamePlaceholder')}
                    />

                    <Input
                        label={t('contact.email')}
                        name="email"
                        type="email"
                        value={readOnlyFields && initialData.email ? initialData.email : formData.email}
                        onChange={handleChange}
                        disabled={readOnlyFields && !!initialData.email}
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

                    {isPublic && (
                        <div className="public-cta-wrapper">
                            <p className="public-cta-title">
                                {t('contact.notCustomerYet')}
                            </p>
                            <Link to="/?auth=register" className="public-cta-link">
                                <span>{t('contact.registerNowFree')}</span>
                                <ArrowRight size={18} className={isRTL ? 'icon-rtl' : 'icon-ltr'} />
                            </Link>
                        </div>
                    )}
                </form>
            )}
        </Card>
    );
};

export default ContactForm;