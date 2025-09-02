import React from 'react';

const LPTransferGuide = ({ lockCanister, onComplete }) => {
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="lp-transfer-guide">
      <h4>🔒 How to Lock LP Tokens Forever</h4>
      
      <div className="transfer-instructions">
        <h5>Transfer Instructions:</h5>
        <ol>
          <li>Go to <a href="https://kongswap.io" target="_blank" rel="noopener noreferrer">KongSwap Portfolio</a></li>
          <li>Find your LP position(s) you want to lock</li>
          <li>Click "Send" and enter this lock canister address:</li>
          <div className="address-copy">
            <code className="lock-address">{lockCanister}</code>
            <button onClick={() => copyToClipboard(lockCanister)} className="copy-btn">📋</button>
          </div>
          <li><strong>⚠️ FINAL WARNING:</strong> This action is permanent and irreversible!</li>
          <li>Confirm the transfer on KongSwap</li>
          <li>Your voting power will update automatically</li>
        </ol>
      </div>

      <div className="dialog-actions">
        <button onClick={onComplete} className="btn-primary">I Understand</button>
      </div>
    </div>
  );
};

export default LPTransferGuide;