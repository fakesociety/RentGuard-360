import React, { useState } from 'react';
import Card from './Card';
import Button from './Button';
import './ClauseEditor.css';

/**
 * ClauseEditor - Edit contract clauses with AI suggestions
 * Features: Accept/Decline AI fix, Manual editing, Revert changes
 */
const ClauseEditor = ({
    clause,
    suggestedFix,
    onAccept,
    onDecline,
    onManualEdit,
    isExpanded = false
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedText, setEditedText] = useState(clause);
    const [status, setStatus] = useState('pending'); // pending, accepted, declined, edited

    const handleAccept = () => {
        setEditedText(suggestedFix);
        setStatus('accepted');
        onAccept?.(suggestedFix);
    };

    const handleDecline = () => {
        setStatus('declined');
        onDecline?.();
    };

    const handleManualEdit = () => {
        setIsEditing(true);
    };

    const handleSaveEdit = () => {
        setIsEditing(false);
        setStatus('edited');
        onManualEdit?.(editedText);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditedText(status === 'accepted' ? suggestedFix : clause);
    };

    const handleRevert = () => {
        setEditedText(clause);
        setStatus('pending');
    };

    const getStatusBadge = () => {
        switch (status) {
            case 'accepted':
                return <span className="clause-status accepted">✓ AI Fix Applied</span>;
            case 'declined':
                return <span className="clause-status declined">✗ Declined</span>;
            case 'edited':
                return <span className="clause-status edited">✎ Manually Edited</span>;
            default:
                return <span className="clause-status pending">⏳ Pending Review</span>;
        }
    };

    return (
        <div className={`clause-editor ${status}`}>
            <div className="clause-header">
                {getStatusBadge()}
                {status !== 'pending' && (
                    <button className="revert-btn" onClick={handleRevert}>
                        ↩ Revert
                    </button>
                )}
            </div>

            <div className="clause-content">
                {/* Original Text */}
                <div className="clause-section original">
                    <label>Original Clause:</label>
                    <div className="clause-text">{clause}</div>
                </div>

                {/* Suggested Fix (if available) */}
                {suggestedFix && status === 'pending' && (
                    <div className="clause-section suggested">
                        <label>AI Suggested Fix:</label>
                        <div className="clause-text suggested-text">{suggestedFix}</div>
                    </div>
                )}

                {/* Current/Edited Text */}
                {(status !== 'pending' || isEditing) && (
                    <div className="clause-section current">
                        <label>
                            {isEditing ? 'Edit Clause:' : 'Current Version:'}
                        </label>
                        {isEditing ? (
                            <textarea
                                className="clause-textarea"
                                value={editedText}
                                onChange={(e) => setEditedText(e.target.value)}
                                rows={4}
                                dir="auto"
                            />
                        ) : (
                            <div className="clause-text current-text">{editedText}</div>
                        )}
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div className="clause-actions">
                {status === 'pending' && !isEditing && (
                    <>
                        {suggestedFix && (
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={handleAccept}
                            >
                                ✓ Accept AI Fix
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleDecline}
                        >
                            ✗ Decline
                        </Button>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={handleManualEdit}
                        >
                            ✎ Edit Manually
                        </Button>
                    </>
                )}

                {isEditing && (
                    <>
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={handleSaveEdit}
                        >
                            💾 Save Changes
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCancelEdit}
                        >
                            Cancel
                        </Button>
                    </>
                )}

                {!isEditing && status !== 'pending' && (
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleManualEdit}
                    >
                        ✎ Edit
                    </Button>
                )}
            </div>
        </div>
    );
};

export default ClauseEditor;
