import React from 'react';
import ContactLayout from '@/components/layout/Contact/ContactLayout';
import ContactForm from '@/components/layout/Contact/ContactForm';
import './ContactPage.css';

const ContactPublic = () => {
    return (
        <ContactLayout>
            <ContactForm 
                initialData={{ name: '', email: '' }} 
                readOnlyFields={false}
                isPublic={true}
            />
        </ContactLayout>
    );
};

export default ContactPublic;
