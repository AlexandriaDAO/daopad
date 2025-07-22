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
  const [expandedStation, setExpandedStation] = useState(null);
  const [orbitPrincipal, setOrbitPrincipal] = useState('');

  useEffect(() => {
    const setupActor = async () => {
      const isLocal = import.meta.env.VITE_DFX_NETWORK === "local";
      const host = isLocal ? "http://localhost:4943" : "https://ic0.app";
      
      const agent = new HttpAgent({ host });
      
      if (isLocal) {
        await agent.fetchRootKey();
      }
      
      const canisterId = import.meta.env.VITE_CANISTER_ID_DAOPAD_BACKEND || 
                        import.meta.env.VITE_DAOPAD_BACKEND_CANISTER_ID ||
                        "ucwa4-rx777-77774-qaada-cai"; // Hardcoded fallback for local dev
      
      if (!canisterId) {
        throw new Error("Backend canister ID not found");
      }
      
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

  useEffect(() => {
    console.log("addingOperator state:", addingOperator);
  }, [addingOperator]);

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
    if (!orbitPrincipal || !orbitPrincipal.trim()) {
      alert("Please enter your Orbit principal");
      return;
    }

    try {
      console.log("Adding operator to station:", stationId, "Principal:", orbitPrincipal);
      setAddingOperator(prev => ({ ...prev, [stationId]: true }));
      
      const result = await actor.add_me_to_station(stationId, orbitPrincipal.trim());
      console.log("Add operator result:", result);
      
      if (result.Ok) {
        alert(`Success! ${result.Ok}\n\nYou can now access this station in Orbit UI at:\nhttps://orbitstation.org/station/${stationId}`);
        setOrbitPrincipal(''); // Clear input
        setExpandedStation(null); // Collapse form
      } else if (result.Err) {
        alert(`Error: ${result.Err}`);
      } else {
        console.error("Unexpected result format:", result);
        alert("Unexpected response from server");
      }
    } catch (error) {
      console.error("Failed to add operator:", error);
      alert("Failed to add operator: " + error.message);
    } finally {
      setAddingOperator(prev => ({ ...prev, [stationId]: false }));
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
      <h2>DAOs</h2>
      
      <div className="info-section">
        <p>This platform now focuses on lbryfun pool proposals.</p>
        <p>To propose a pool, go to the Proposals tab and submit the canister ID of an active lbryfun pool's primary token.</p>
        
        <div className="features-info">
          <h3>Features:</h3>
          <ul>
            <li>Submit proposals for lbryfun pools</li>
            <li>View token information including name, symbol, and total supply</li>
            <li>Accept proposals with staked ALEX tokens</li>
            <li>Track proposal status and history</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default DAOsTab;