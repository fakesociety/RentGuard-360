import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ContactLayout from '@/components/layout/Contact/ContactLayout';
import ContactForm from '@/components/layout/Contact/ContactForm';
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
