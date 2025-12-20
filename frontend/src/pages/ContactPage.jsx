import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { sendContactMessage } from '../services/api';
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
        subject: '',
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
            const response = await sendContactMessage(formData);

            if (response.ticketId || response.message === 'Ticket created') {
                setSubmitStatus('success');
                setFormData({ ...formData, subject: '', message: '' });
            } else {
                throw new Error(response.error || 'Failed to send message');
            }
        } catch (err) {
            console.error('Contact form error:', err);
            setError(err.message || (isRTL ? 'שליחת ההודעה נכשלה. נסו שוב.' : 'Failed to send message. Please try again.'));
            setSubmitStatus('error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="contact-page" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="contact-container">
                <div className="contact-header animate-fadeIn">
                    <h1>📧 {t('nav.contact')}</h1>
                    <p>{isRTL ? 'יש לכם שאלה או צריכים עזרה? אנחנו כאן בשבילכם!' : 'Have a question or need help? We\'re here for you!'}</p>
                </div>

                <div className="contact-content">
                    <Card variant="elevated" padding="lg" className="contact-form-card animate-slideUp">
                        {submitStatus === 'success' ? (
                            <div className="success-message">
                                <span className="success-icon">✅</span>
                                <h3>{isRTL ? 'ההודעה נשלחה!' : 'Message Sent!'}</h3>
                                <p>{isRTL ? 'נחזור אליכם תוך 24 שעות.' : 'We\'ll get back to you within 24 hours.'}</p>
                                <Button
                                    variant="secondary"
                                    onClick={() => setSubmitStatus(null)}
                                >
                                    {isRTL ? 'שליחת הודעה נוספת' : 'Send Another Message'}
                                </Button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit}>
                                <h3>{isRTL ? 'שלחו לנו הודעה' : 'Send Us a Message'}</h3>

                                <div className="form-row">
                                    <Input
                                        label={isRTL ? 'שם' : 'Name'}
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        required
                                        placeholder={isRTL ? 'ישראל ישראלי' : 'John Smith'}
                                    />
                                    <Input
                                        label={isRTL ? 'אימייל' : 'Email'}
                                        name="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                        placeholder="example@email.com"
                                    />
                                </div>

                                <Input
                                    label={isRTL ? 'נושא' : 'Subject'}
                                    name="subject"
                                    value={formData.subject}
                                    onChange={handleChange}
                                    required
                                    placeholder={isRTL ? 'במה נוכל לעזור?' : 'How can we help?'}
                                />

                                <div className="textarea-wrapper">
                                    <label className="input-label">{isRTL ? 'הודעה' : 'Message'}</label>
                                    <textarea
                                        name="message"
                                        value={formData.message}
                                        onChange={handleChange}
                                        required
                                        placeholder={isRTL ? 'תארו את הבעיה או השאלה שלכם בפירוט...' : 'Describe your issue or question in detail...'}
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
                                >
                                    {isSubmitting ? (isRTL ? 'שולח...' : 'Sending...') : (isRTL ? 'שליחת הודעה' : 'Send Message')}
                                </Button>
                            </form>
                        )}
                    </Card>

                    <div className="contact-info animate-slideUp" style={{ animationDelay: '100ms' }}>
                        <Card variant="glass" padding="md">
                            <h4>📍 {isRTL ? 'עזרה מהירה' : 'Quick Help'}</h4>
                            <ul className="help-list">
                                <li>
                                    <strong>{isRTL ? 'הניתוח לוקח יותר מדי זמן?' : 'Analysis taking too long?'}</strong>
                                    <span>{isRTL ? 'בדרך כלל מסתיים תוך 60 שניות. נסו לרענן את הדף.' : 'Usually completes within 60 seconds. Try refreshing the page.'}</span>
                                </li>
                                <li>
                                    <strong>{isRTL ? 'בעיות בהעלאה?' : 'Upload issues?'}</strong>
                                    <span>{isRTL ? 'וודאו שהקובץ בפורמט PDF ומתחת ל-25MB.' : 'Make sure the file is PDF format and under 25MB.'}</span>
                                </li>
                                <li>
                                    <strong>{isRTL ? 'שאלות על התוצאות?' : 'Questions about results?'}</strong>
                                    <span>{isRTL ? 'ה-AI שלנו מספק הסברים לכל ממצא.' : 'Our AI provides explanations for every finding.'}</span>
                                </li>
                            </ul>
                        </Card>

                        <Card variant="glass" padding="md">
                            <h4>⏰ {isRTL ? 'זמן תגובה' : 'Response Time'}</h4>
                            <p className="response-info">
                                {isRTL
                                    ? <>אנחנו בדרך כלל עונים תוך <strong>24 שעות</strong> בימי עבודה. לבעיות דחופות, הוסיפו "דחוף" בנושא ההודעה.</>
                                    : <>We usually respond within <strong>24 hours</strong> on business days. For urgent issues, add "Urgent" to the subject line.</>
                                }
                            </p>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContactPage;
