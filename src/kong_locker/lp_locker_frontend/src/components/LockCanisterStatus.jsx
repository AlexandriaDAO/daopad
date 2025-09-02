import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useIdentity } from '../hooks/useIdentity';
import { createLockCanister, fundAndRegisterLockCanister } from '../state/lpLocker/lpLockerThunks';
import { createLpLockerService, MIN_ICP_FOR_REGISTRATION } from '../services/lpLockerService';
import { setLockCanister, setLockCanisterStatus } from '../state/lpLocker/lpLockerSlice';

const LockCanisterStatus = () => {
  const dispatch = useDispatch();
  const { identity } = useIdentity();
  const { lockCanister, lockCanisterStatus, lockingInProgress } = useSelector(state => state.lpLocker);
  
  const handleCreateLockCanister = () => {
    dispatch(createLockCanister(identity));
  };
  
  const handleFundAndRegister = () => {
    dispatch(fundAndRegisterLockCanister({
      identity,
      lockCanisterPrincipal: lockCanister,
      amountIcp: MIN_ICP_FOR_REGISTRATION
    }));
  };

  const handleCheckStatus = async () => {
    try {
      const service = createLpLockerService(identity);
      const status = await service.checkLockCanisterStatus(lockCanister);
      
      if (status.canRetryRegistration) {
        // Auto-retry registration if ICP is available
        handleFundAndRegister();
      } else if (status.hasICP) {
        alert(`Lock canister has ${(Number(status.icpAmount) / 100_000_000).toFixed(2)} ICP but needs ${MIN_ICP_FOR_REGISTRATION} minimum`);
      } else {
        alert('No ICP found in lock canister. Please send ICP first.');
      }
    } catch (error) {
      alert(`Status check failed: ${error.message}`);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  // TEMPORARY DEBUG: Force clear state
  const handleForceClear = () => {
    console.log('🔥 FORCE CLEARING lock canister state');
    dispatch(setLockCanister(null));
    dispatch(setLockCanisterStatus('none'));
  };

  if (!lockCanister) {
    return (
      <div className="lock-canister-status">
        <h3>🔒 Lock Canister</h3>
        <p>Create your personal lock canister to permanently lock LP tokens.</p>
        <button 
          onClick={handleCreateLockCanister}
          disabled={lockingInProgress}
          className="btn-primary"
        >
          {lockingInProgress ? 'Creating...' : 'Create Lock Canister'}
        </button>
      </div>
    );
  }

  return (
    <div className="lock-canister-status">
      <h3>🔒 Lock Canister</h3>
      <div className="canister-info">
        <div className="canister-address">
          <span className="address-label">Address:</span>
          <code className="address-value">{lockCanister}</code>
          <button onClick={() => copyToClipboard(lockCanister)} className="copy-btn">📋</button>
          <button onClick={handleForceClear} className="btn-danger" style={{marginLeft: '0.5rem', fontSize: '0.8rem'}}>🔥 Clear</button>
        </div>
        
        <div className="canister-status">
          <span className={`status-badge ${lockCanisterStatus}`}>
            {lockCanisterStatus === 'created' && '⏳ Created - Fund with 1 ICP to register'}
            {lockCanisterStatus === 'registered' && '✅ Registered - Ready to receive LP tokens'}
          </span>
        </div>
        
        {lockCanisterStatus === 'created' && (
          <div className="registration-action">
            <p>Send {MIN_ICP_FOR_REGISTRATION} ICP to the address above, then:</p>
            <button 
              onClick={handleFundAndRegister}
              disabled={lockingInProgress}
              className="btn-primary"
            >
              {lockingInProgress ? 'Registering...' : 'Register with KongSwap'}
            </button>
            <button 
              onClick={handleCheckStatus}
              disabled={lockingInProgress}
              className="btn-secondary"
            >
              Check Status
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LockCanisterStatus;