import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { LPLockingService } from '../services/lpLockingService';
import { fetchAlexandriaBalances } from '../state/balance/balanceThunks';
import './KongSwapRegistration.scss';

const KongSwapRegistration = ({ identity }) => {
  const dispatch = useDispatch();
  const { lpVotingPower, totalLpVotingPower } = useSelector(state => state.balance);
  
  const [lpAddress, setLpAddress] = useState('');
  const [userVotingPower, setUserVotingPower] = useState('0');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [lpLockingService, setLpLockingService] = useState(null);

  useEffect(() => {
    if (identity) {
      const service = new LPLockingService(identity);
      setLpLockingService(service);
      loadUserLpData(service);
    }
  }, [identity]);

  const loadUserLpData = async (service) => {
    setIsLoading(true);
    setError('');
    
    try {
      // Try to get existing LP address
      const addressResult = await service.getMyLpAddress();
      if (addressResult) {
        setLpAddress(addressResult);
        
        // Get current voting power
        const powerResult = await service.getMyVotingPower();
        if (powerResult) {
          setUserVotingPower(formatVotingPower(powerResult));
        }
      }
    } catch (error) {
      console.log('User not registered yet or error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatVotingPower = (power) => {
    if (!power) return '0';
    // Convert from Nat to readable format (assuming 8 decimals)
    const powerValue = Number(power) / 100_000_000;
    return powerValue.toFixed(4);
  };

  const handleRegister = async () => {
    if (!lpLockingService) {
      setError('Service not initialized. Please refresh the page.');
      return;
    }

    setIsRegistering(true);
    setError('');

    try {
      const result = await lpLockingService.registerForLpLocking();
      
      if (result.success && result.address) {
        setLpAddress(result.address);
        
        // Update Redux state
        dispatch({
          type: 'balance/setUserLpAddress',
          payload: result.address
        });
        
        // Refresh balances
        await dispatch(fetchAlexandriaBalances(identity));
      } else {
        setError(result.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError('Failed to register: ' + error.message);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleSyncVotingPower = async () => {
    if (!lpLockingService) {
      setError('Service not initialized. Please refresh the page.');
      return;
    }

    setIsSyncing(true);
    setError('');

    try {
      const result = await lpLockingService.syncMyVotingPower();
      
      if (result.success) {
        const formattedPower = formatVotingPower(result.votingPower);
        setUserVotingPower(formattedPower);
        setLastSyncTime(new Date());
        
        // Update Redux state
        dispatch({
          type: 'balance/setLpVotingPower',
          payload: result.votingPower
        });
        
        // Refresh all balances
        await dispatch(fetchAlexandriaBalances(identity));
      } else {
        setError(result.error || 'Sync failed. This may indicate that KongSwap does not support account ID queries.');
      }
    } catch (error) {
      console.error('Sync error:', error);
      setError('Failed to sync voting power: ' + error.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const copyToClipboard = () => {
    if (lpAddress) {
      navigator.clipboard.writeText(lpAddress);
      // Show temporary success message
      const originalError = error;
      setError('');
      const tempMessage = document.createElement('div');
      tempMessage.className = 'copy-success';
      tempMessage.textContent = 'Copied to clipboard!';
      document.querySelector('.lp-address-display')?.appendChild(tempMessage);
      setTimeout(() => {
        tempMessage.remove();
        setError(originalError);
      }, 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="kongswap-registration loading">
        <div className="loading-spinner">Loading LP locking data...</div>
      </div>
    );
  }

  // If user has not registered yet
  if (!lpAddress) {
    return (
      <div className="kongswap-registration unregistered">
        <div className="registration-header">
          <h4>LP Token Locking (Subaccount System)</h4>
          <div className="info-tooltip">
            <span className="tooltip-icon">ⓘ</span>
            <div className="tooltip-content">
              Get a unique account ID for locking your LP tokens from KongSwap.
              This uses a subaccount-based system for perfect attribution.
            </div>
          </div>
        </div>

        <div className="registration-intro">
          <p>Register to receive your unique LP locking address.</p>
          <p className="subtext">This address will be permanently linked to your Internet Identity.</p>
          
          <div className="experimental-notice">
            <span className="notice-icon">🧪</span>
            <span>Experimental Feature: Testing KongSwap account ID compatibility</span>
          </div>

          <button 
            className="register-btn primary"
            onClick={handleRegister}
            disabled={isRegistering}
          >
            {isRegistering ? 'Registering...' : 'Generate My LP Locking Address'}
          </button>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
        </div>
      </div>
    );
  }

  // User is registered - show LP address and voting power
  return (
    <div className="kongswap-registration registered">
      <div className="registration-header">
        <h4>Your LP Locking Dashboard</h4>
        <div className="info-tooltip">
          <span className="tooltip-icon">ⓘ</span>
          <div className="tooltip-content">
            Send LP tokens from KongSwap to your unique address to gain voting power.
          </div>
        </div>
      </div>

      <div className="lp-address-section">
        <label>Your Unique LP Locking Address:</label>
        <div className="lp-address-display">
          <input 
            type="text" 
            value={lpAddress} 
            readOnly 
            className="address-input"
          />
          <button 
            className="copy-btn"
            onClick={copyToClipboard}
            title="Copy to clipboard"
          >
            📋
          </button>
        </div>
        <p className="address-note">
          Send your LP tokens from KongSwap to this address to lock them for voting power.
        </p>
      </div>

      <div className="voting-power-section">
        <div className="power-header">
          <h5>Your LP Voting Power</h5>
          <button 
            className="sync-btn"
            onClick={handleSyncVotingPower}
            disabled={isSyncing}
          >
            {isSyncing ? 'Syncing...' : '🔄 Sync Balance'}
          </button>
        </div>

        <div className="power-display">
          <span className="power-value">{userVotingPower}</span>
          <span className="power-unit">LP Tokens</span>
        </div>

        {lastSyncTime && (
          <p className="last-sync">
            Last synced: {lastSyncTime.toLocaleTimeString()}
          </p>
        )}

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
      </div>

      <div className="instructions-section">
        <h5>How to Lock LP Tokens:</h5>
        <ol>
          <li>Go to KongSwap and navigate to your LP tokens</li>
          <li>Select "Send" or "Transfer" for your LP tokens</li>
          <li>Enter your LP locking address (copied above) as the recipient</li>
          <li>Confirm the transaction on KongSwap</li>
          <li>Click "Sync Balance" here to update your voting power</li>
        </ol>
        
        <div className="experimental-notice">
          <span className="notice-icon">⚠️</span>
          <span>If sync fails, it means KongSwap doesn't support account ID queries yet.</span>
        </div>
      </div>
    </div>
  );
};

export default KongSwapRegistration;