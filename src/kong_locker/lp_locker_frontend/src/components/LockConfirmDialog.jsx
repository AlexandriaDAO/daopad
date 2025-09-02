import React, { useState } from 'react';

const LockConfirmDialog = ({ position, onConfirm, onCancel }) => {
  const [confirmChecked, setConfirmChecked] = useState(false);
  
  return (
    <div className="lock-confirm-overlay">
      <div className="lock-confirm-dialog">
        <h3>⚠️ PERMANENT LOCK WARNING</h3>
        <p>You are about to <strong>permanently lock</strong> your LP tokens:</p>
        
        <div className="position-info">
          <strong>{position.symbol_0}/{position.symbol_1}</strong>
          <div>Balance: {position.balance.toFixed(6)}</div>
          <div>USD Value: ${position.usd_balance.toFixed(2)}</div>
        </div>
        
        <div className="warning-text">
          <p><strong>THIS ACTION CANNOT BE UNDONE.</strong></p>
          <p>Your tokens will be locked forever in a blackholed canister.</p>
        </div>
        
        <label className="confirm-checkbox">
          <input 
            type="checkbox" 
            checked={confirmChecked}
            onChange={(e) => setConfirmChecked(e.target.checked)}
          />
          I understand this lock is permanent and irreversible
        </label>
        
        <div className="dialog-actions">
          <button onClick={onCancel} className="btn-secondary">Cancel</button>
          <button 
            onClick={() => onConfirm(position)}
            disabled={!confirmChecked}
            className="btn-danger"
          >
            LOCK TOKENS FOREVER
          </button>
        </div>
      </div>
    </div>
  );
};

export default LockConfirmDialog;