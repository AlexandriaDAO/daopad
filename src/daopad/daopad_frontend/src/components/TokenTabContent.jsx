import React, { useState, useEffect } from 'react';
import { Principal } from '@dfinity/principal';
import { DAOPadBackendService } from '../services/daopadBackend';
import './TokenTabContent.scss';

const TokenTabContent = ({ token, identity, votingPower, lpPositions, onRefresh }) => {
  const [orbitStation, setOrbitStation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [stationName, setStationName] = useState('');

  useEffect(() => {
    loadOrbitStationStatus();
    setStationName(`${token.symbol} Treasury`);
  }, [token]);

  const loadOrbitStationStatus = async () => {
    if (!identity) return;

    setLoading(true);
    setError('');

    try {
      const daopadService = new DAOPadBackendService(identity);
      const result = await daopadService.getMyOrbitStation();

      if (result.success && result.data) {
        setOrbitStation(result.data);
      } else {
        setOrbitStation(null);
      }
    } catch (err) {
      console.error('Error loading orbit station:', err);
      setError('Failed to load Orbit Station status');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStation = async () => {
    if (!stationName.trim()) {
      setError('Please enter a station name');
      return;
    }

    setCreating(true);
    setError('');

    try {
      const daopadService = new DAOPadBackendService(identity);
      const tokenPrincipal = Principal.fromText(token.canister_id);
      const result = await daopadService.createTokenOrbitStation(stationName.trim(), tokenPrincipal);

      if (result.success) {
        await loadOrbitStationStatus();
        if (onRefresh) {
          onRefresh();
        }
      } else {
        setError(result.error || 'Failed to create Orbit Station');
      }
    } catch (err) {
      console.error('Error creating station:', err);
      setError(err.message || 'An error occurred while creating the station');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteStation = async () => {
    if (!confirm('Are you sure you want to delete your Orbit Station? This action cannot be undone.')) {
      return;
    }

    setCreating(true);
    setError('');

    try {
      const daopadService = new DAOPadBackendService(identity);
      const result = await daopadService.deleteOrbitStation();

      if (result.success) {
        setOrbitStation(null);
        if (onRefresh) {
          onRefresh();
        }
      } else {
        setError(result.error || 'Failed to delete Orbit Station');
      }
    } catch (err) {
      console.error('Error deleting station:', err);
      setError(err.message || 'An error occurred while deleting the station');
    } finally {
      setCreating(false);
    }
  };

  const formatUsdValue = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const totalUsdValue = lpPositions.reduce((sum, pos) => {
    let tokenValue = 0;
    if (pos.address_0 === token.canister_id) {
      tokenValue += pos.usd_amount_0 || 0;
    }
    if (pos.address_1 === token.canister_id) {
      tokenValue += pos.usd_amount_1 || 0;
    }
    return sum + tokenValue;
  }, 0);

  if (loading) {
    return (
      <div className="token-tab-content loading">
        <div className="spinner"></div>
        <p>Loading {token.symbol} information...</p>
      </div>
    );
  }

  return (
    <div className="token-tab-content">
      <div className="token-header">
        <div className="token-info">
          <h3>{token.symbol}</h3>
          <span className="token-chain">{token.chain}</span>
          <code className="token-canister">{token.canister_id}</code>
        </div>
        <div className="voting-power-display">
          <div className="power-number">{votingPower.toLocaleString()}</div>
          <div className="power-label">Voting Power</div>
        </div>
      </div>

      <div className="content-sections">
        <div className="section">
          <h4>Voting Power</h4>
          <div className="detail-rows">
            <div className="detail-row">
              <label>Total USD Value:</label>
              <span className="value">{formatUsdValue(totalUsdValue)}</span>
            </div>
            <div className="detail-row">
              <label>Voting Power:</label>
              <span className="value">{votingPower.toLocaleString()} VP</span>
            </div>
            <div className="detail-row">
              <label>LP Positions:</label>
              <span className="value">{lpPositions.length} position{lpPositions.length !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {lpPositions.length > 0 && (
            <div className="lp-positions">
              <h5>Your LP Positions</h5>
              {lpPositions.map((pos, index) => (
                <div key={index} className="lp-position">
                  <div className="position-name">{pos.name}</div>
                  <div className="position-details">
                    <span>{pos.symbol_0}/{pos.symbol_1}</span>
                    <span className="position-value">
                      {formatUsdValue(pos.usd_balance || 0)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="section">
          <h4>Treasury Status</h4>

          {orbitStation ? (
            <div className="station-exists">
              <div className="station-status">
                <div className="status-indicator active">✓ Active</div>
                <div className="station-name">{orbitStation.name || 'Unnamed Station'}</div>
              </div>

              <div className="station-details">
                <div className="detail-row">
                  <label>Station ID:</label>
                  <code className="canister-id">{orbitStation.station_id.toString()}</code>
                </div>
                <div className="detail-row">
                  <label>Upgrader ID:</label>
                  <code className="canister-id">{orbitStation.upgrader_id.toString()}</code>
                </div>
                <div className="detail-row">
                  <label>Created:</label>
                  <span className="value">{new Date(Number(orbitStation.created_at) / 1000000).toLocaleDateString()}</span>
                </div>
              </div>

              {error && <div className="error-message">{error}</div>}

              <div className="station-actions">
                <button
                  onClick={() => window.open(`https://${orbitStation.station_id}.icp0.io`, '_blank')}
                  className="action-button primary"
                >
                  Open Treasury
                </button>
                <button
                  onClick={handleDeleteStation}
                  disabled={creating}
                  className="action-button danger"
                >
                  {creating ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          ) : (
            <div className="station-creation">
              <div className="creation-status">
                <div className="status-indicator inactive">○ No Station</div>
                <p>Create treasury for {token.symbol} governance.</p>
              </div>

              <div className="creation-form">
                <div className="form-group">
                  <label htmlFor="station-name">Name:</label>
                  <input
                    id="station-name"
                    type="text"
                    value={stationName}
                    onChange={(e) => setStationName(e.target.value)}
                    placeholder={`${token.symbol} Treasury`}
                    className="name-input"
                    maxLength={50}
                  />
                </div>

                {error && <div className="error-message">{error}</div>}

                <button
                  onClick={handleCreateStation}
                  disabled={creating || !stationName.trim()}
                  className="action-button primary create-button"
                >
                  {creating ? 'Creating...' : `Create Treasury`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TokenTabContent;