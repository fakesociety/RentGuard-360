/** Public (guest) contact page - displays the ContactForm without pre-filled user data. */
import React from 'react';
import ContactLayout from '@/features/contact/ContactLayout';
import ContactForm from '@/features/contact/ContactForm';
import '@/pages/core/ContactPage.css';

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
