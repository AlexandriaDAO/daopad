import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Principal } from '@dfinity/principal';
import { DAOPadBackendService } from '../services/daopadBackend';
import { LPLockingService } from '../services/lpLockingService';
import { 
  setAvailableDaos, 
  setAvailableDaosLoading,
  setAvailableDaosError,
  setRegisteredDaos,
  setRegisteredDaosLoading,
  addRegisteredDao,
  setSelectedDao 
} from '../features/dao/daoSlice';
import './DaoDashboard.scss';

const DaoDashboard = ({ identity, onSelectDao }) => {
  const dispatch = useDispatch();
  const {
    availableDaos,
    availableDaosLoading,
    availableDaosError,
    registeredDaos,
    registeredDaosLoading,
    selectedDao,
  } = useSelector(state => state.dao);
  
  const [registering, setRegistering] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [lpPositions, setLpPositions] = useState([]);
  const [lpLoading, setLpLoading] = useState(false);
  
  useEffect(() => {
    loadDaoData();
    if (identity) {
      fetchLPPositions();
    }
  }, [identity]);
  
  const loadDaoData = async () => {
    if (!identity) return;
    
    const daopadService = new DAOPadBackendService(identity);
    
    // Load available DAOs
    dispatch(setAvailableDaosLoading(true));
    try {
      const daosResult = await daopadService.detectAvailableDaos();
      if (daosResult.success) {
        dispatch(setAvailableDaos(daosResult.data));
      } else {
        dispatch(setAvailableDaosError(daosResult.error));
      }
    } catch (err) {
      dispatch(setAvailableDaosError(err.message));
    } finally {
      dispatch(setAvailableDaosLoading(false));
    }
    
    // Load registered DAOs
    dispatch(setRegisteredDaosLoading(true));
    try {
      const regsResult = await daopadService.getMyDaoRegistrations();
      if (regsResult.success) {
        dispatch(setRegisteredDaos(regsResult.data));
      }
    } catch (err) {
      console.error('Failed to load registrations:', err);
    } finally {
      dispatch(setRegisteredDaosLoading(false));
    }
  };
  
  const fetchLPPositions = async () => {
    if (!identity) {
      setLpPositions([]);
      return;
    }

    setLpLoading(true);
    try {
      const lpService = new LPLockingService(identity);
      const result = await lpService.getLPPositions();

      if (result.success) {
        setLpPositions(result.data || []);
      } else {
        console.error('Failed to fetch LP positions:', result.error);
      }
    } catch (err) {
      console.error('Error fetching LP positions:', err);
    } finally {
      setLpLoading(false);
    }
  };
  
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadDaoData(), fetchLPPositions()]);
    setRefreshing(false);
  };
  
  const handleRegisterWithDao = async (tokenCanister) => {
    setRegistering(prev => ({ ...prev, [tokenCanister]: true }));
    
    try {
      const daopadService = new DAOPadBackendService(identity);
      const tokenPrincipal = Principal.fromText(tokenCanister);
      const result = await daopadService.registerWithTokenDao(tokenPrincipal);
      
      if (result.success) {
        // Reload data to get updated status
        await loadDaoData();
      } else {
        alert(`Registration failed: ${result.error}`);
      }
    } catch (err) {
      console.error('Registration error:', err);
      alert(`Registration failed: ${err.message}`);
    } finally {
      setRegistering(prev => ({ ...prev, [tokenCanister]: false }));
    }
  };
  
  const handleSelectDao = (dao) => {
    dispatch(setSelectedDao(dao));
    if (onSelectDao) {
      onSelectDao(dao);
    }
  };
  
  // Categorize DAOs
  const registeredDaoTokens = new Set(registeredDaos.map(([token]) => token.toString()));
  const availableToJoin = availableDaos.filter(dao => 
    dao.station_canister[0] && !dao.is_registered
  );
  const myDaos = availableDaos.filter(dao => dao.is_registered);
  const pendingDaos = availableDaos.filter(dao => !dao.station_canister[0]);
  
  return (
    <div className="dao-dashboard">
      <div className="dashboard-header">
        <h2>Your DAOs</h2>
        <button 
          onClick={handleRefresh} 
          className="refresh-button"
          disabled={refreshing}
        >
          {refreshing ? 'Refreshing...' : '↻ Refresh'}
        </button>
      </div>

      {/* LP Positions Summary */}
      {lpPositions.length > 0 && (
        <div className="lp-summary-section">
          <h3>Your Locked LP Positions</h3>
          <div className="lp-summary-stats">
            <div className="stat">
              <span className="value">{lpPositions.length}</span>
              <span className="label">LP Positions</span>
            </div>
            <div className="stat">
              <span className="value">${lpPositions.reduce((sum, p) => sum + p.usd_balance, 0).toFixed(2)}</span>
              <span className="label">Total LP Value</span>
            </div>
            <div className="stat">
              <span className="value">{lpPositions.reduce((sum, p) => sum + p.balance, 0).toFixed(4)}</span>
              <span className="label">Total LP Tokens</span>
            </div>
          </div>
          <div className="lp-positions-preview">
            {lpPositions.slice(0, 3).map((position, index) => (
              <div key={index} className="lp-preview-card">
                <span className="pool-name">{position.symbol_0}/{position.symbol_1}</span>
                <span className="pool-value">${position.usd_balance.toFixed(2)}</span>
              </div>
            ))}
            {lpPositions.length > 3 && (
              <div className="lp-preview-card more">
                <span className="pool-name">+{lpPositions.length - 3} more</span>
              </div>
            )}
          </div>
        </div>
      )}
      
      {availableDaosLoading ? (
        <div className="loading">Detecting available DAOs from your LP positions...</div>
      ) : availableDaosError ? (
        <div className="error">
          <p>Error loading DAOs: {availableDaosError}</p>
          <button onClick={handleRefresh}>Try Again</button>
        </div>
      ) : (
        <>
          {/* My DAOs Section */}
          {myDaos.length > 0 && (
            <div className="dao-section">
              <h3>My DAOs</h3>
              <div className="dao-grid">
                {myDaos.map(dao => (
                  <div key={dao.token_canister.toString()} className="dao-card registered">
                    <div className="dao-token">
                      <span className="label">Token:</span>
                      <span className="value">{dao.token_canister.toString().slice(0, 10)}...</span>
                    </div>
                    {dao.station_canister[0] && (
                      <div className="dao-station">
                        <span className="label">Station:</span>
                        <span className="value">{dao.station_canister[0].toString().slice(0, 10)}...</span>
                      </div>
                    )}
                    <div className="dao-status">
                      <span className="status-badge registered">✓ Registered</span>
                    </div>
                    <button 
                      onClick={() => handleSelectDao(dao)}
                      className={`select-button ${selectedDao?.token_canister === dao.token_canister ? 'selected' : ''}`}
                    >
                      {selectedDao?.token_canister === dao.token_canister ? 'Selected' : 'View Proposals'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Available to Join Section */}
          {availableToJoin.length > 0 && (
            <div className="dao-section">
              <h3>Available to Join</h3>
              <p className="section-description">
                You have locked liquidity for these tokens. Join their DAOs to participate in governance.
              </p>
              <div className="dao-grid">
                {availableToJoin.map(dao => (
                  <div key={dao.token_canister.toString()} className="dao-card available">
                    <div className="dao-token">
                      <span className="label">Token:</span>
                      <span className="value">{dao.token_canister.toString().slice(0, 10)}...</span>
                    </div>
                    {dao.station_canister[0] && (
                      <div className="dao-station">
                        <span className="label">Station:</span>
                        <span className="value">{dao.station_canister[0].toString().slice(0, 10)}...</span>
                      </div>
                    )}
                    <button 
                      onClick={() => handleRegisterWithDao(dao.token_canister.toString())}
                      disabled={registering[dao.token_canister.toString()]}
                      className="join-button"
                    >
                      {registering[dao.token_canister.toString()] ? 'Registering...' : 'Join DAO'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Pending DAOs Section */}
          {pendingDaos.length > 0 && (
            <div className="dao-section">
              <h3>Tokens Without DAOs</h3>
              <p className="section-description">
                You have locked liquidity for these tokens, but they don't have DAOs set up yet.
              </p>
              <div className="dao-grid">
                {pendingDaos.map(dao => (
                  <div key={dao.token_canister.toString()} className="dao-card pending">
                    <div className="dao-token">
                      <span className="label">Token:</span>
                      <span className="value">{dao.token_canister.toString().slice(0, 10)}...</span>
                    </div>
                    <div className="dao-status">
                      <span className="status-badge pending">No DAO Yet</span>
                    </div>
                    <p className="pending-message">
                      Contact the token team to set up their DAO
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Empty State */}
          {availableDaos.length === 0 && (
            <div className="empty-state">
              <h3>No DAOs Available</h3>
              <p>
                You don't have any locked liquidity positions yet.
                Visit <a href="https://konglocker.org" target="_blank" rel="noopener noreferrer">konglocker.org</a> to lock LP tokens and join DAOs.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DaoDashboard;