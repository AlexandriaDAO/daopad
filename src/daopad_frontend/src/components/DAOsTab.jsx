import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { HttpAgent, Actor } from "@dfinity/agent";
import { idlFactory } from '../../../declarations/daopad_backend';

function DAOsTab() {
  const { principal, isAuthenticated } = useSelector(state => state.auth);
  const [actor, setActor] = useState(null);
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addingOperator, setAddingOperator] = useState({});

  useEffect(() => {
    const setupActor = async () => {
      const isLocal = import.meta.env.VITE_DFX_NETWORK === "local";
      const host = isLocal ? "http://localhost:4943" : "https://ic0.app";
      
      const agent = new HttpAgent({ host });
      
      if (isLocal) {
        await agent.fetchRootKey();
      }
      
      const canisterId = import.meta.env.VITE_CANISTER_ID_DAOPAD_BACKEND || 
                        import.meta.env.VITE_DAOPAD_BACKEND_CANISTER_ID;
      
      const daopadActor = Actor.createActor(idlFactory, {
        agent,
        canisterId,
      });
      
      setActor(daopadActor);
    };
    
    setupActor();
  }, []);

  useEffect(() => {
    if (actor) {
      loadStations();
    }
  }, [actor]);

  const loadStations = async () => {
    if (!actor) return;
    
    try {
      setLoading(true);
      setError(null);
      const result = await actor.get_orbit_stations();
      
      if (result.Ok) {
        setStations(result.Ok);
      } else if (result.Err) {
        setError(result.Err);
      }
    } catch (error) {
      console.error("Failed to load stations:", error);
      setError("Failed to load stations");
    } finally {
      setLoading(false);
    }
  };

  const handleAddOperator = async (stationId) => {
    const principal = prompt("Enter your Orbit principal (e.g., xxxxx-xxxxx-xxxxx-xxxxx):");
    
    if (!principal || !principal.trim()) {
      return;
    }

    try {
      setAddingOperator({ ...addingOperator, [stationId]: true });
      
      const result = await actor.add_me_to_station(stationId, principal.trim());
      
      if (result.Ok) {
        alert(`Success! ${result.Ok}\n\nYou can now access this station in Orbit UI at:\nhttps://orbitstation.org/station/${stationId}`);
      } else if (result.Err) {
        alert(`Error: ${result.Err}`);
      }
    } catch (error) {
      console.error("Failed to add operator:", error);
      alert("Failed to add operator: " + error.message);
    } finally {
      setAddingOperator({ ...addingOperator, [stationId]: false });
    }
  };

  if (loading) {
    return (
      <div className="daos-tab">
        <h2>Your Orbit Stations</h2>
        <p>Loading stations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="daos-tab">
        <h2>Your Orbit Stations</h2>
        <p className="error">Error: {error}</p>
        <button onClick={loadStations}>Retry</button>
      </div>
    );
  }

  return (
    <div className="daos-tab">
      <h2>Your Orbit Stations</h2>
      
      {stations.length === 0 ? (
        <p>No stations found. Create a DAO first to see its treasury station here.</p>
      ) : (
        <div className="stations-list">
          {stations.map(([id, name]) => (
            <div key={id} className="station-card">
              <h3>{name}</h3>
              <div className="station-id">
                <span>Station ID: </span>
                <code>{id}</code>
              </div>
              <button 
                onClick={() => handleAddOperator(id)}
                disabled={addingOperator[id]}
                className="add-operator-btn"
              >
                {addingOperator[id] ? "Adding..." : "Add Me as Operator"}
              </button>
            </div>
          ))}
        </div>
      )}
      
      <div className="help-section">
        <h3>How to find your Orbit principal:</h3>
        <ol>
          <li>Go to <a href="https://orbitstation.org" target="_blank" rel="noopener noreferrer">Orbit Station</a></li>
          <li>Click on your profile/avatar in the top right</li>
          <li>Copy your principal ID</li>
          <li>Paste it when prompted above</li>
        </ol>
      </div>
    </div>
  );
}

export default DAOsTab;