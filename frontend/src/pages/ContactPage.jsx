import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { sendContactMessage } from '../services/api';
import Card from '../components/Card';
import Input from '../components/Input';
import Button from '../components/Button';
import './ContactPage.css';

const ContactPage = () => {
    const { userAttributes } = useAuth();
    const [formData, setFormData] = useState({
        name: userAttributes?.name || '',
        email: userAttributes?.email || '',
        subject: '',
        message: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState(null); // 'success' | 'error' | null
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
            // Send contact message via API
            const response = await sendContactMessage(formData);

            if (response.success) {
                setSubmitStatus('success');
                setFormData({ ...formData, subject: '', message: '' });
            } else {
                throw new Error(response.error || 'Failed to send message');
            }
        } catch (err) {
            console.error('Contact form error:', err);
            setError(err.message || 'Failed to send message. Please try again.');
            setSubmitStatus('error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="contact-page">
            <div className="contact-container">
                <div className="contact-header animate-fadeIn">
                    <h1>📧 Contact Support</h1>
                    <p>Have a question or need help? We're here for you!</p>
                </div>

                <div className="contact-content">
                    <Card variant="elevated" padding="lg" className="contact-form-card animate-slideUp">
                        {submitStatus === 'success' ? (
                            <div className="success-message">
                                <span className="success-icon">✅</span>
                                <h3>Message Sent!</h3>
                                <p>We'll get back to you within 24 hours.</p>
                                <Button
                                    variant="secondary"
                                    onClick={() => setSubmitStatus(null)}
                                >
                                    Send Another Message
                                </Button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit}>
                                <h3>Send us a Message</h3>

                                <div className="form-row">
                                    <Input
                                        label="Your Name"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        required
                                        placeholder="John Doe"
                                    />
                                    <Input
                                        label="Email Address"
                                        name="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                        placeholder="john@example.com"
                                    />
                                </div>

                                <Input
                                    label="Subject"
                                    name="subject"
                                    value={formData.subject}
                                    onChange={handleChange}
                                    required
                                    placeholder="What can we help you with?"
                                />

                                <div className="textarea-wrapper">
                                    <label className="input-label">Message</label>
                                    <textarea
                                        name="message"
                                        value={formData.message}
                                        onChange={handleChange}
                                        required
                                        placeholder="Describe your issue or question in detail..."
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
                                    {isSubmitting ? 'Sending...' : 'Send Message'}
                                </Button>
                            </form>
                        )}
                    </Card>

                    <div className="contact-info animate-slideUp" style={{ animationDelay: '100ms' }}>
                        <Card variant="glass" padding="md">
                            <h4>📍 Quick Help</h4>
                            <ul className="help-list">
                                <li>
                                    <strong>Analysis taking too long?</strong>
                                    <span>Usually completes in under 60 seconds. Try refreshing the page.</span>
                                </li>
                                <li>
                                    <strong>Upload issues?</strong>
                                    <span>Make sure your file is PDF format and under 25MB.</span>
                                </li>
                                <li>
                                    <strong>Questions about results?</strong>
                                    <span>Our AI provides explanations with each finding.</span>
                                </li>
                            </ul>
                        </Card>

                        <Card variant="glass" padding="md">
                            <h4>⏰ Response Time</h4>
                            <p className="response-info">
                                We typically respond within <strong>24 hours</strong> during business days.
                                For urgent issues, please include "URGENT" in the subject.
                            </p>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContactPage;
