import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { DAOPadBackendService } from '../services/daopadBackend';
import { setLpPrincipal, setLpPrincipalLoading, setLpPrincipalError } from '../features/dao/daoSlice';
import './LpPrincipalSetup.scss';

const LpPrincipalSetup = ({ identity, onComplete }) => {
  const dispatch = useDispatch();
  const [lpPrincipalInput, setLpPrincipalInput] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!lpPrincipalInput.trim()) {
      setError('Please enter your LP Locker principal');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    dispatch(setLpPrincipalLoading(true));
    
    try {
      const daopadService = new DAOPadBackendService(identity);
      const result = await daopadService.setLpPrincipal(lpPrincipalInput.trim());
      
      if (result.success) {
        dispatch(setLpPrincipal(lpPrincipalInput.trim()));
        if (onComplete) {
          onComplete();
        }
      } else {
        setError(result.error || 'Failed to set LP principal');
        dispatch(setLpPrincipalError(result.error));
      }
    } catch (err) {
      console.error('Error setting LP principal:', err);
      setError(err.message || 'An error occurred');
      dispatch(setLpPrincipalError(err.message));
    } finally {
      setIsSubmitting(false);
      dispatch(setLpPrincipalLoading(false));
    }
  };
  
  return (
    <div className="lp-principal-setup">
      <div className="setup-card">
        <h2>Welcome to DAOPad Multi-DAO</h2>
        <p className="setup-description">
          To participate in DAOs, you need to set your LP Locker principal first.
          This is a one-time setup that links your locked liquidity to your DAOPad account.
        </p>
        
        <div className="steps">
          <div className="step">
            <span className="step-number">1</span>
            <div className="step-content">
              <h3>Lock Liquidity on KongLocker</h3>
              <p>Visit <a href="https://konglocker.org" target="_blank" rel="noopener noreferrer">konglocker.org</a> to lock your LP tokens</p>
            </div>
          </div>
          
          <div className="step">
            <span className="step-number">2</span>
            <div className="step-content">
              <h3>Copy Your LP Principal</h3>
              <p>After locking, you'll receive a unique LP principal identifier</p>
            </div>
          </div>
          
          <div className="step active">
            <span className="step-number">3</span>
            <div className="step-content">
              <h3>Enter Your LP Principal</h3>
              <form onSubmit={handleSubmit}>
                <input
                  type="text"
                  placeholder="Enter your LP Locker principal (e.g., abcd-1234-...)"
                  value={lpPrincipalInput}
                  onChange={(e) => setLpPrincipalInput(e.target.value)}
                  disabled={isSubmitting}
                  className="principal-input"
                />
                {error && <div className="error-message">{error}</div>}
                <button 
                  type="submit" 
                  disabled={isSubmitting || !lpPrincipalInput.trim()}
                  className="submit-button"
                >
                  {isSubmitting ? 'Setting up...' : 'Set LP Principal'}
                </button>
              </form>
            </div>
          </div>
        </div>
        
        <div className="info-box">
          <h4>Why do I need an LP Principal?</h4>
          <p>
            Your LP Principal proves you have locked liquidity on KongSwap. 
            This gives you voting power in DAOs based on the tokens you've locked.
            One LP principal works for ALL DAOs - set it once, use it everywhere!
          </p>
        </div>
      </div>
    </div>
  );
};

export default LpPrincipalSetup;