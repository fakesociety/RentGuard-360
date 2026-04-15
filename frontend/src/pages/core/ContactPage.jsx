/** Authenticated contact page - pre-fills the ContactForm with the logged-in user's name and email. */
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ContactLayout from '@/features/contact/ContactLayout';
import ContactForm from '@/features/contact/ContactForm';
import './ContactPage.css';

const ContactPage = () => {
    const { userAttributes } = useAuth();
    
    return (
        <ContactLayout>
            <ContactForm 
                initialData={{ 
                    name: userAttributes?.name || '', 
                    email: userAttributes?.email || '' 
                }} 
                readOnlyFields={true}
                isPublic={false}
            />
        </ContactLayout>
    );
};

export default ContactPage;
