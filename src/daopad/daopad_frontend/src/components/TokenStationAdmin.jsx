import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Principal } from '@dfinity/principal';
import { DAOPadBackendService } from '../services/daopadBackend';
import { 
  setTokenStations, 
  setTokenStationsLoading,
  addTokenStation,
  removeTokenStation 
} from '../features/dao/daoSlice';
import './TokenStationAdmin.scss';

const TokenStationAdmin = ({ identity }) => {
  const dispatch = useDispatch();
  const { tokenStations, tokenStationsLoading } = useSelector(state => state.dao);
  
  const [tokenInput, setTokenInput] = useState('');
  const [stationInput, setStationInput] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // LP Principal management state
  const [currentLpPrincipal, setCurrentLpPrincipal] = useState('');
  const [newLpPrincipal, setNewLpPrincipal] = useState('');
  const [lpLoading, setLpLoading] = useState(false);
  const [lpError, setLpError] = useState('');
  const [lpSuccess, setLpSuccess] = useState('');
  
  useEffect(() => {
    loadTokenStations();
    loadLpPrincipal();
  }, [identity]);
  
  const loadTokenStations = async () => {
    if (!identity) return;
    
    dispatch(setTokenStationsLoading(true));
    try {
      const daopadService = new DAOPadBackendService(identity);
      const result = await daopadService.listTokenStations();
      
      if (result.success) {
        dispatch(setTokenStations(result.data));
      }
    } catch (err) {
      console.error('Failed to load token stations:', err);
    } finally {
      dispatch(setTokenStationsLoading(false));
    }
  };
  
  const loadLpPrincipal = async () => {
    if (!identity) return;
    
    setLpLoading(true);
    try {
      const daopadService = new DAOPadBackendService(identity);
      const result = await daopadService.getMyLpPrincipal();
      
      if (result.success && result.data) {
        setCurrentLpPrincipal(result.data);
      } else {
        setCurrentLpPrincipal('');
      }
    } catch (err) {
      console.error('Failed to load LP principal:', err);
      setCurrentLpPrincipal('');
    } finally {
      setLpLoading(false);
    }
  };
  
  const handleSetLpPrincipal = async (e) => {
    e.preventDefault();
    setLpError('');
    setLpSuccess('');
    
    if (!newLpPrincipal.trim()) {
      setLpError('LP principal cannot be empty');
      return;
    }
    
    setLpLoading(true);
    
    try {
      const daopadService = new DAOPadBackendService(identity);
      const result = await daopadService.setLpPrincipal(newLpPrincipal.trim());
      
      if (result.success) {
        setLpSuccess(result.data);
        setCurrentLpPrincipal(newLpPrincipal.trim());
        setNewLpPrincipal('');
      } else {
        setLpError(result.error);
      }
    } catch (err) {
      setLpError(err.message || 'Failed to set LP principal');
    } finally {
      setLpLoading(false);
    }
  };
  
  const handleLinkTokenToStation = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    // Validate inputs
    try {
      Principal.fromText(tokenInput);
      Principal.fromText(stationInput);
    } catch (err) {
      setError('Invalid Principal ID format');
      return;
    }
    
    setIsLinking(true);
    
    try {
      const daopadService = new DAOPadBackendService(identity);
      const tokenPrincipal = Principal.fromText(tokenInput);
      const stationPrincipal = Principal.fromText(stationInput);
      
      const result = await daopadService.linkTokenToStation(tokenPrincipal, stationPrincipal);
      
      if (result.success) {
        setSuccess(result.data);
        dispatch(addTokenStation({ token: tokenInput, station: stationInput }));
        setTokenInput('');
        setStationInput('');
        await loadTokenStations(); // Reload to get fresh data
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message || 'Failed to link token to station');
    } finally {
      setIsLinking(false);
    }
  };
  
  const handleUnlinkToken = async (tokenCanister) => {
    if (!window.confirm(`Are you sure you want to unlink token ${tokenCanister}?`)) {
      return;
    }
    
    setIsUnlinking(prev => ({ ...prev, [tokenCanister]: true }));
    
    try {
      const daopadService = new DAOPadBackendService(identity);
      const tokenPrincipal = Principal.fromText(tokenCanister);
      
      const result = await daopadService.unlinkTokenFromStation(tokenPrincipal);
      
      if (result.success) {
        dispatch(removeTokenStation(tokenCanister));
        setSuccess(result.data);
        await loadTokenStations(); // Reload to get fresh data
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err.message || 'Failed to unlink token');
    } finally {
      setIsUnlinking(prev => ({ ...prev, [tokenCanister]: false }));
    }
  };
  
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };
  
  return (
    <div className="token-station-admin">
      <div className="admin-header">
        <h2>Token-Station Admin</h2>
        <p className="description">
          Manage the mapping between tokens and their Orbit Stations. 
          Each token can have one station for DAO governance.
        </p>
      </div>
      
      <div className="lp-principal-section">
        <h3>LP Principal Management</h3>
        <p className="description">
          Set your LP Locker principal to participate in DAO governance. 
          This should match your principal from <a href="https://konglocker.org" target="_blank" rel="noopener noreferrer">konglocker.org</a>
        </p>
        
        <div className="current-lp">
          <div className="info-group">
            <label>Current LP Principal</label>
            {lpLoading ? (
              <div className="loading-inline">Loading...</div>
            ) : currentLpPrincipal ? (
              <div className="current-value">
                <span>{currentLpPrincipal}</span>
                <button 
                  className="copy-btn" 
                  onClick={() => copyToClipboard(currentLpPrincipal)}
                  title="Copy LP principal"
                >
                  ⧉
                </button>
              </div>
            ) : (
              <div className="no-value">No LP principal set</div>
            )}
          </div>
        </div>
        
        <form onSubmit={handleSetLpPrincipal}>
          <div className="form-group">
            <label>Set New LP Principal</label>
            <input
              type="text"
              placeholder="Enter your LP Locker principal"
              value={newLpPrincipal}
              onChange={(e) => setNewLpPrincipal(e.target.value)}
              disabled={lpLoading}
            />
          </div>
          
          {lpError && <div className="error-message">{lpError}</div>}
          {lpSuccess && <div className="success-message">{lpSuccess}</div>}
          
          <button 
            type="submit" 
            disabled={lpLoading || !newLpPrincipal.trim()}
            className="set-lp-button"
          >
            {lpLoading ? 'Setting...' : 'Set LP Principal'}
          </button>
        </form>
      </div>
      
      <div className="add-mapping-section">
        <h3>Link Token to Station</h3>
        <form onSubmit={handleLinkTokenToStation}>
          <div className="form-group">
            <label>Token Canister ID</label>
            <input
              type="text"
              placeholder="e.g., 54fqz-5iaaa-aaaap-qkmqa-cai"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              disabled={isLinking}
            />
          </div>
          
          <div className="form-group">
            <label>Orbit Station Canister ID</label>
            <input
              type="text"
              placeholder="e.g., fec7w-zyaaa-aaaaa-qaffq-cai"
              value={stationInput}
              onChange={(e) => setStationInput(e.target.value)}
              disabled={isLinking}
            />
          </div>
          
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
          
          <button 
            type="submit" 
            disabled={isLinking || !tokenInput || !stationInput}
            className="link-button"
          >
            {isLinking ? 'Linking...' : 'Link Token to Station'}
          </button>
        </form>
      </div>
      
      <div className="existing-mappings">
        <h3>Existing Mappings</h3>
        
        {tokenStationsLoading ? (
          <div className="loading">Loading token-station mappings...</div>
        ) : tokenStations.length === 0 ? (
          <div className="empty-state">
            <p>No token-station mappings yet.</p>
          </div>
        ) : (
          <div className="mappings-list">
            {tokenStations.map(([token, station]) => {
              const tokenStr = token.toString();
              const stationStr = station.toString();
              return (
                <div key={tokenStr} className="mapping-item">
                  <div className="mapping-info">
                    <div className="token-info">
                      <span className="label">Token:</span>
                      <span className="value">{tokenStr}</span>
                      <button 
                        className="copy-btn" 
                        onClick={() => copyToClipboard(tokenStr)}
                        title="Copy token ID"
                      >
                        ⧉
                      </button>
                    </div>
                    <div className="station-info">
                      <span className="label">Station:</span>
                      <span className="value">{stationStr}</span>
                      <button 
                        className="copy-btn" 
                        onClick={() => copyToClipboard(stationStr)}
                        title="Copy station ID"
                      >
                        ⧉
                      </button>
                    </div>
                  </div>
                  <button
                    className="unlink-btn"
                    onClick={() => handleUnlinkToken(tokenStr)}
                    disabled={isUnlinking[tokenStr]}
                  >
                    {isUnlinking[tokenStr] ? 'Unlinking...' : 'Unlink'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      <div className="admin-info">
        <h4>Important Notes:</h4>
        <ul>
          <li>Each token can only be linked to one station</li>
          <li>The Alexandria token (ALEX) is pre-linked by default</li>
          <li>Only authorized principals can manage these mappings</li>
          <li>Unlinking a token will prevent users from accessing that DAO</li>
        </ul>
      </div>
    </div>
  );
};

export default TokenStationAdmin;