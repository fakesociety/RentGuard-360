import { useState } from 'react';

export const useLegalAccordion = (initialSectionId) => {
    const [activeSection, setActiveSection] = useState(initialSectionId || null);

    const handleToggle = (id) => {
        setActiveSection(prev => prev === id ? null : id);

        if (activeSection !== id) {
            setTimeout(() => {
                const el = document.getElementById(id);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }, 150);
        }
    };

    return { activeSection, handleToggle };
};
