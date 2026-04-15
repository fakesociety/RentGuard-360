/** Manages which legal section accordion is open and handles smooth scrolling. */
import { useState, useEffect } from 'react';

export const useLegalAccordion = (initialSectionId) => {
    const [activeSection, setActiveSection] = useState(initialSectionId || null);

    const handleToggle = (id) => {
        setActiveSection(prev => prev === id ? null : id);
    };

    useEffect(() => {
        if (activeSection) {
            const target = document.getElementById(activeSection);
            if (!target) return;

            // Animation config
            const duration = 400; 
            const startY = window.scrollY;
            const startTime = performance.now();
            
            // Surgical fix: Increased mobile offset (240px) to clear the expanded/floating navbar
            const headerOffset = window.innerWidth <= 768 ? 240 : 120;

            const animateScroll = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Ease function (EaseOutQuart)
                const ease = 1 - Math.pow(1 - progress, 4);

                // Dynamic target recalculation on every frame
                const dynamicTargetY = target.getBoundingClientRect().top + window.scrollY - headerOffset;

                window.scrollTo(0, startY + (dynamicTargetY - startY) * ease);

                if (progress < 1) {
                    requestAnimationFrame(animateScroll);
                }
            };

            requestAnimationFrame(animateScroll);
        }
    }, [activeSection]);

    return { activeSection, handleToggle };
};
