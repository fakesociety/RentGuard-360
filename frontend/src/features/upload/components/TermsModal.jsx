import React from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import './TermsModal.css';

const TermsModal = ({ isOpen, onClose, onAccept }) => {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay">
            <Card variant="elevated" padding="lg" className="modal-content animate-scaleIn">
                <h2 className="modal-title">Terms & Conditions</h2>
                <div className="modal-body" style={{maxHeight:'300px', overflowY:'auto', borderBottom:'1px solid #e2e8f0', paddingBottom:'16px', marginBottom:'16px'}}>
                    <p>By using this service, you agree to our Terms of Service.</p>
                </div>
                <div className="modal-actions" style={{display:'flex', justifyContent:'space-between'}}>
                    <Button variant="ghost" onClick={onClose}>Decline</Button>
                    <Button variant="primary" onClick={onAccept}>Accept</Button>
                </div>
            </Card>
        </div>
    );
};
export default TermsModal;
