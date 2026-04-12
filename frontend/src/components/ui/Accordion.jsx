import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import './Accordion.css';

const Accordion = ({ 
    title, 
    icon, 
    children, 
    defaultExpanded = false, 
    isExpanded: controlledExpanded,
    onToggle,
    className = '',
    contentClassName = '',
    dir = 'ltr' 
}) => {
    const [localExpanded, setLocalExpanded] = useState(defaultExpanded);

    const isExpanded = controlledExpanded !== undefined ? controlledExpanded : localExpanded;

    const toggleAccordion = () => {
        if (controlledExpanded === undefined) {
            setLocalExpanded(!isExpanded);
        }
        if (onToggle) {
            onToggle(!isExpanded);
        }
    };

    return (
        <div className={`lf-accordion ${isExpanded ? 'expanded' : ''} ${className}`} dir={dir}>
            <button 
                className="lf-accordion-toggle"
                onClick={toggleAccordion}
                aria-expanded={isExpanded}
            >
                <div className="lf-accordion-title">
                    {icon && <span aria-hidden="true">{icon}</span>}
                    <span style={{ margin: 0 }}>{title}</span>
                </div>
                <ChevronDown 
                    className={`lf-accordion-chevron ${isExpanded ? 'rotated' : ''}`} 
                    size={20} 
                />
            </button>
            <div 
                className="lf-accordion-content-wrapper"
                aria-hidden={!isExpanded}
            >
                <div className={`lf-accordion-content ${contentClassName}`.trim()}>
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Accordion;
