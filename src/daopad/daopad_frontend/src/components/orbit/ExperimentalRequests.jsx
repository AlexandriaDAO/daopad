import React, { useState, useEffect } from 'react';
import { Actor, HttpAgent } from '@dfinity/agent';
import { idlFactory } from '../../declarations/daopad_backend';

const ExperimentalRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      // Create actor directly without identity complications
      const agent = new HttpAgent({ host: 'https://ic0.app' });
      const actor = Actor.createActor(idlFactory, {
        agent,
        canisterId: 'lwsav-iiaaa-aaaap-qp2qq-cai',
      });

      const result = await actor.get_orbit_requests_simple();
      if (result.Ok) {
        setRequests(result.Ok);
      } else if (result.Err) {
        setError(result.Err);
      }
    } catch (err) {
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Experimental Requests</h2>

      <button
        onClick={fetchRequests}
        disabled={loading}
        className="mb-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? 'Loading...' : 'Refresh'}
      </button>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          Error: {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">ID</th>
              <th className="px-4 py-2 text-left">Title</th>
              <th className="px-4 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr>
                <td colSpan="3" className="px-4 py-4 text-center text-gray-500">
                  No requests found
                </td>
              </tr>
            ) : (
              requests.map((request, index) => (
                <tr key={index} className="border-t">
                  <td className="px-4 py-2">{request.id}</td>
                  <td className="px-4 py-2">{request.title}</td>
                  <td className="px-4 py-2">{request.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ExperimentalRequests;