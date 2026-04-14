import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, Zap, Pause } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext/LanguageContext';

const benefits = [
    { icon: Shield, titleKey: 'landing.benefitAdvancedAiTitle', descKey: 'landing.benefitAdvancedAiDesc' },
    { icon: Lock, titleKey: 'landing.benefitPrivacyTitle', descKey: 'landing.benefitPrivacyDesc' },
    { icon: Zap, titleKey: 'landing.benefitResultsTitle', descKey: 'landing.benefitResultsDesc' },
];

const BenefitsCarousel = ({ carouselRef, carouselInView }) => {
    const { t } = useLanguage();
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % benefits.length);
    const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + benefits.length) % benefits.length);
    const CurrentBenefitIcon = benefits[currentSlide].icon;

    useEffect(() => {
        if (isPaused) return;
        const timer = setInterval(() => setCurrentSlide((prev) => (prev + 1) % benefits.length), 4000);
        return () => clearInterval(timer);
    }, [isPaused]);

    return (
        <section className="lr-carousel" ref={carouselRef}>
            <motion.div className="benefits-carousel" onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => setIsPaused(false)} onTouchStart={() => setIsPaused(true)} onTouchEnd={() => setIsPaused(false)} initial={{ opacity: 0, y: 30 }} animate={carouselInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5 }}>
                {isPaused && <span className="carousel-paused"><Pause size={14} /></span>}
                <button className="carousel-arrow" onClick={prevSlide} aria-label={t('landing.carouselPrevious')}>‹</button>
                <div className="carousel-content" key={currentSlide}>
                    <div className="carousel-icon"><CurrentBenefitIcon size={34} strokeWidth={1.9} /></div>
                    <h4>{t(benefits[currentSlide].titleKey)}</h4>
                    <p>{t(benefits[currentSlide].descKey)}</p>
                </div>
                <button className="carousel-arrow" onClick={nextSlide} aria-label={t('landing.carouselNext')}>›</button>
            </motion.div>
            <div className="carousel-dots">
                {benefits.map((_, idx) => (
                    <button key={idx} className={`carousel-dot ${idx === currentSlide ? 'active' : ''}`} onClick={() => setCurrentSlide(idx)} aria-label={`Slide ${idx + 1}`} />
                ))}
            </div>
        </section>
    );
};

export default BenefitsCarousel;