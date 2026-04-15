/** Manages which legal section accordion is open. */
import { useState } from 'react';

export const useLegalAccordion = (initialSectionId) => {
    const [activeSection, setActiveSection] = useState(initialSectionId || null);

    const handleToggle = (id) => {
        setActiveSection(prev => prev === id ? null : id);
    };

    return { activeSection, handleToggle };
};
