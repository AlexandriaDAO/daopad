import { useState, useEffect } from 'react';
import { UtilityService } from '../services/backend';

/**
 * useTokenMetadata Hook
 *
 * Manages token metadata loading and state
 *
 * @param {object|null} token - Token object with canister_id
 * @returns {{tokenMetadata: object|null, loading: boolean, error: string|null}}
 */
export const useTokenMetadata = (token) => {
  const [tokenMetadata, setTokenMetadata] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) {
      setTokenMetadata(null);
      return;
    }

    const loadMetadata = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await UtilityService.getTokenMetadata(token.canister_id);
        if (result.success) {
          setTokenMetadata(result.data);
        } else {
          setError(result.error || 'Failed to load metadata');
        }
      } catch (err) {
        console.error('Failed to load token metadata:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadMetadata();
  }, [token]);

  return { tokenMetadata, loading, error };
};
