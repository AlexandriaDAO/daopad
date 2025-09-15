import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Principal } from '@dfinity/principal';
import { DAOPadBackendService } from '../services/daopadBackend';
import { KongLockerService } from '../services/kongLockerService';
import { setKongLockerCanister, setKongLockerLoading, setKongLockerError } from '../features/dao/daoSlice';
import './KongLockerSetup.scss';

const KongLockerSetup = ({ identity, onComplete }) => {
  const dispatch = useDispatch();
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [hasLockCanister, setHasLockCanister] = useState(null);
  const [detectedCanister, setDetectedCanister] = useState(null);
  const [validationStep, setValidationStep] = useState('');
  
  // Check if user has a Kong Locker canister on mount
  useEffect(() => {
    checkForExistingLockCanister();
  }, [identity]);

  const checkForExistingLockCanister = async () => {
    if (!identity) return;

    setIsChecking(true);
    setError('');

    try {
      const kongLockerService = new KongLockerService(identity);
      const result = await kongLockerService.getMyLockCanister();

      if (result.success && result.data) {
        setHasLockCanister(true);
        setDetectedCanister(result.data.toString());
      } else {
        setHasLockCanister(false);
      }
    } catch (err) {
      console.error('Error checking for lock canister:', err);
      setHasLockCanister(false);
    } finally {
      setIsChecking(false);
    }
  };

  const handleAutoConnect = async () => {
    if (!detectedCanister) {
      setError('No Kong Locker canister detected');
      return;
    }

    setIsChecking(true);
    setError('');
    dispatch(setKongLockerLoading(true));

    try {
      setValidationStep('Connecting to your Kong Locker...');

      // Register with DAOPad backend using the detected canister
      const daopadService = new DAOPadBackendService(identity);
      const kongLockerPrincipal = Principal.fromText(detectedCanister);
      const result = await daopadService.registerWithKongLocker(kongLockerPrincipal);

      if (result.success) {
        dispatch(setKongLockerCanister(detectedCanister));
        if (onComplete) {
          onComplete();
        }
      } else {
        setError(result.error || 'Failed to register Kong Locker canister');
        dispatch(setKongLockerError(result.error));
      }
    } catch (err) {
      console.error('Error registering Kong Locker canister:', err);
      setError(err.message || 'An error occurred');
      dispatch(setKongLockerError(err.message));
    } finally {
      setIsChecking(false);
      setValidationStep('');
      dispatch(setKongLockerLoading(false));
    }
  };
  
  return (
    <div className="kong-locker-setup">
      <div className="setup-card">
        <h2>Connect Your Kong Locker</h2>
        <p className="setup-description">
          To participate in DAO governance, connect your Kong Locker canister.
          Your voting power is based on the USD value of your locked LP tokens.
        </p>

        {isChecking ? (
          <div className="checking-status">
            <div className="spinner"></div>
            <p>Checking for existing Kong Locker...</p>
          </div>
        ) : hasLockCanister === true ? (
          // User has a lock canister - show auto-connect
          <div className="auto-connect-section">
            <div className="detected-canister">
              <div className="success-icon">✓</div>
              <h3>Kong Locker Detected!</h3>
              <p>We found your Kong Locker canister:</p>
              <code className="canister-id">{detectedCanister}</code>
            </div>

            {error && <div className="error-message">{error}</div>}
            {validationStep && <div className="validation-message">{validationStep}</div>}

            <button
              onClick={handleAutoConnect}
              disabled={isChecking}
              className="submit-button primary"
            >
              {isChecking ? 'Connecting...' : 'Connect to DAOPad'}
            </button>
          </div>
        ) : hasLockCanister === false ? (
          // User doesn't have a lock canister - show creation steps
          <div className="no-canister-section">
            <div className="warning-box">
              <h3>No Kong Locker Found</h3>
              <p>You don't have a Kong Locker canister yet. Please create one first to participate in governance.</p>
            </div>

            <div className="steps">
              <div className="step active">
                <span className="step-number">1</span>
                <div className="step-content">
                  <h3>Create Your Kong Locker</h3>
                  <p>Visit <a href="https://konglocker.com" target="_blank" rel="noopener noreferrer">konglocker.com</a> to permanently lock your LP tokens</p>
                  <a
                    href="https://konglocker.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="submit-button secondary"
                  >
                    Go to Kong Locker →
                  </a>
                </div>
              </div>

              <div className="step">
                <span className="step-number">2</span>
                <div className="step-content">
                  <h3>Return Here</h3>
                  <p>After creating your lock, return to this page and we'll automatically detect your Kong Locker</p>
                </div>
              </div>
            </div>

            <button
              onClick={checkForExistingLockCanister}
              disabled={isChecking}
              className="refresh-button"
            >
              {isChecking ? 'Checking...' : 'Check Again'}
            </button>
          </div>
        ) : null}
        
        <div className="info-box">
          <h4>How Voting Power Works</h4>
          <p>
            Your voting power is calculated as: <strong>Total USD Value of Locked LP × 100</strong>
          </p>
          <p>
            For example, if you have $50.25 worth of locked LP tokens, your voting power is 5,025.
            This ensures fair representation based on your financial commitment to the ecosystem.
          </p>
        </div>
        
        <div className="help-section">
          <h4>Need Help?</h4>
          <ul>
            <li>Make sure you've created a lock on Kong Locker first</li>
            <li>Copy the exact canister principal from your Kong Locker dashboard</li>
            <li>Ensure you're using the same Internet Identity for both services</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default KongLockerSetup;