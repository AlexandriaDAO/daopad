import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

/**
 * Smart fetch hook that adds React Query-like caching behavior to Redux thunks
 *
 * @param {Function} thunk - The async thunk to dispatch
 * @param {Function} selector - Selector to get the data
 * @param {Function} loadingSelector - Selector to get loading state
 * @param {string} key - The key to identify this resource (tokenId or stationId)
 * @param {Object} deps - Dependencies for the thunk (identity, filters, etc.)
 * @param {number} staleTime - Time in ms before data is considered stale (default: 30s)
 * @returns {Object} { data, loading, error }
 */
export const useSmartFetch = (
  thunk,
  selector,
  loadingSelector,
  key,
  deps,
  staleTime = 30000
) => {
  const dispatch = useDispatch();
  const data = useSelector(state => selector(state, key));
  const loading = useSelector(state => loadingSelector(state, key));

  // Get lastFetch from the appropriate slice
  const lastFetch = useSelector(state => {
    const resource = deps.resource; // e.g., 'requests', 'votingPower'
    const slice = deps.slice || 'orbit'; // Default to orbit slice
    return state[slice]?.[resource]?.lastFetch?.[key];
  });

  useEffect(() => {
    // Check if data is stale
    const isStale = !lastFetch || (Date.now() - lastFetch > staleTime);

    // Only fetch if:
    // 1. Data is stale
    // 2. Not currently loading
    // 3. Required dependencies are present
    const hasRequiredDeps = deps.identity && key;

    if (isStale && !loading && hasRequiredDeps) {
      dispatch(thunk({ ...deps, [deps.keyName || 'key']: key }));
    }
  }, [dispatch, key, lastFetch, loading, staleTime, JSON.stringify(deps)]);

  return { data, loading };
};

export default useSmartFetch;
