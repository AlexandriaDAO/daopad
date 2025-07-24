import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { lbryfunService } from '../services/lbryfunService';
import PoolCard from './PoolCard';

function PoolDashboard({ onNavigateToProposal }) {
  const { principal, isAuthenticated } = useSelector(state => state.auth);
  const [pools, setPools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, live, upcoming

  useEffect(() => {
    fetchPools();
  }, [filter]);

  const fetchPools = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let poolData;
      
      switch (filter) {
        case 'live':
          poolData = await lbryfunService.getLiveTokens();
          break;
        case 'upcoming':
          poolData = await lbryfunService.getUpcomingTokens();
          break;
        default:
          poolData = await lbryfunService.getAllTokenRecords();
      }
      
      // Sort by creation time, newest first
      poolData.sort((a, b) => Number(b.created_time) - Number(a.created_time));
      
      setPools(poolData);
    } catch (err) {
      console.error('Error fetching pools:', err);
      setError('Failed to fetch pools from LbryFun');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchPools();
  };

  if (loading) {
    return (
      <div className="pools-loading">
        <div className="paper-content">
          <p>Loading pools from LbryFun...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pools-error">
        <div className="paper-content">
          <p className="error-message">{error}</p>
          <button onClick={handleRefresh} className="paper-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pools-dashboard">
      <div className="pools-header paper-content">
        <h2>LbryFun Token Pools</h2>
        <p>Browse and interact with token pools from LbryFun</p>
        
        <div className="filter-controls">
          <button 
            className={`filter-button ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Pools ({pools.length})
          </button>
          <button 
            className={`filter-button ${filter === 'live' ? 'active' : ''}`}
            onClick={() => setFilter('live')}
          >
            Live Pools
          </button>
          <button 
            className={`filter-button ${filter === 'upcoming' ? 'active' : ''}`}
            onClick={() => setFilter('upcoming')}
          >
            Upcoming Pools
          </button>
          <button onClick={handleRefresh} className="paper-button refresh-button">
            Refresh
          </button>
        </div>
      </div>

      <div className="pools-grid">
        {pools.length === 0 ? (
          <div className="paper-content no-pools">
            <p>No pools found</p>
          </div>
        ) : (
          pools.map((pool) => (
            <PoolCard key={pool.id} pool={pool} onNavigateToProposal={onNavigateToProposal} />
          ))
        )}
      </div>
    </div>
  );
}

export default PoolDashboard;