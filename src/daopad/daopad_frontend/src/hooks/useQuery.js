import { useState, useEffect, useCallback, useRef } from 'react';
import { queryCache } from '../services/cache/QueryCache';

/**
 * Extract tags from cache key for categorization
 * @private
 */
function extractTags(key) {
    const tags = [];
    if (key.includes('orbit')) tags.push('orbit');
    if (key.includes('token')) tags.push('token');
    if (key.includes('voting')) tags.push('voting');
    if (key.includes('balance')) tags.push('balance');
    if (key.includes('request')) tags.push('request');
    if (key.includes('member')) tags.push('member');
    return tags;
}

/**
 * React Query-like hook with intelligent caching
 * Provides automatic caching, refetching, and error handling
 *
 * @param {string} key - Unique query key
 * @param {Function} fetcher - Async function that fetches data
 * @param {Object} options - Query options
 * @param {boolean} options.enabled - Whether query is enabled (default: true)
 * @param {number} options.staleTime - Time before data is considered stale (default: 30000)
 * @param {number} options.cacheTime - Time to keep data in cache (default: 300000)
 * @param {number} options.retry - Number of retry attempts (default: 3)
 * @param {number} options.retryDelay - Delay between retries in ms (default: 1000)
 * @param {Function} options.onSuccess - Success callback
 * @param {Function} options.onError - Error callback
 * @param {number} options.refetchInterval - Auto-refetch interval in ms (default: null)
 * @param {boolean} options.refetchOnWindowFocus - Refetch on window focus (default: true)
 * @param {Array<string>} options.tags - Additional cache tags (default: [])
 * @returns {Object} Query state and methods
 */
export function useQuery(key, fetcher, options = {}) {
    const {
        enabled = true,
        staleTime = 30000,
        cacheTime = 300000,
        retry = 3,
        retryDelay = 1000,
        onSuccess,
        onError,
        refetchInterval = null,
        refetchOnWindowFocus = true,
        tags = []
    } = options;

    const [state, setState] = useState({
        data: null,
        error: null,
        isLoading: false,
        isFetching: false,
        isStale: false
    });

    const retryCount = useRef(0);
    const intervalRef = useRef(null);
    const isMounted = useRef(true);

    // Check cache first on mount
    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    useEffect(() => {
        if (!enabled) return;

        const cachedData = queryCache.get(key);
        if (cachedData) {
            setState(prev => ({
                ...prev,
                data: cachedData,
                isStale: false,
                isLoading: false
            }));
        } else {
            fetchData();
        }

        // Subscribe to cache updates
        const unsubscribe = queryCache.subscribe(key, (data) => {
            if (!isMounted.current) return;
            if (data) {
                setState(prev => ({ ...prev, data, isStale: false }));
            }
        });

        return unsubscribe;
    }, [key, enabled]);

    const fetchData = useCallback(async () => {
        if (!enabled) return;

        setState(prev => ({
            ...prev,
            isLoading: !prev.data,
            isFetching: true,
            error: null
        }));

        try {
            const data = await fetcher();

            if (!isMounted.current) return;

            // Update cache with extracted and provided tags
            const allTags = [...extractTags(key), ...tags];
            queryCache.set(key, data, {
                ttl: cacheTime,
                tags: allTags
            });

            setState({
                data,
                error: null,
                isLoading: false,
                isFetching: false,
                isStale: false
            });

            onSuccess?.(data);
            retryCount.current = 0;
        } catch (error) {
            if (!isMounted.current) return;

            if (retryCount.current < retry) {
                retryCount.current++;
                const delay = retryDelay * retryCount.current;
                setTimeout(() => {
                    if (isMounted.current) {
                        fetchData();
                    }
                }, delay);
            } else {
                setState(prev => ({
                    ...prev,
                    error,
                    isLoading: false,
                    isFetching: false
                }));
                onError?.(error);
                retryCount.current = 0;
            }
        }
    }, [key, fetcher, enabled, cacheTime, retry, retryDelay, onSuccess, onError, tags]);

    // Refetch on interval
    useEffect(() => {
        if (refetchInterval && enabled && refetchInterval > 0) {
            intervalRef.current = setInterval(() => {
                if (isMounted.current) {
                    fetchData();
                }
            }, refetchInterval);
            return () => {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                }
            };
        }
    }, [refetchInterval, enabled, fetchData]);

    // Refetch on window focus
    useEffect(() => {
        if (!refetchOnWindowFocus || !enabled) return;

        const handleFocus = () => {
            if (!isMounted.current) return;
            const age = queryCache.getAge(key);
            if (age > staleTime) {
                setState(prev => ({ ...prev, isStale: true }));
                fetchData();
            }
        };

        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [refetchOnWindowFocus, staleTime, key, enabled, fetchData]);

    // Manual refetch
    const refetch = useCallback(() => {
        retryCount.current = 0;
        return fetchData();
    }, [fetchData]);

    // Invalidate cache and refetch
    const invalidate = useCallback(() => {
        queryCache.invalidate(key);
        return fetchData();
    }, [key, fetchData]);

    return {
        ...state,
        refetch,
        invalidate,
        isSuccess: !!state.data && !state.error,
        isError: !!state.error
    };
}

/**
 * Hook for mutations (create, update, delete operations)
 * Provides optimistic updates and automatic cache invalidation
 *
 * @param {Function} mutationFn - Async mutation function
 * @param {Object} options - Mutation options
 * @param {Function} options.onSuccess - Success callback
 * @param {Function} options.onError - Error callback
 * @param {Array<string>} options.invalidateTags - Tags to invalidate on success
 * @param {Array<string>} options.invalidateKeys - Keys to invalidate on success
 * @returns {Object} Mutation state and methods
 */
export function useMutation(mutationFn, options = {}) {
    const { onSuccess, onError, invalidateTags = [], invalidateKeys = [] } = options;

    const [state, setState] = useState({
        data: null,
        error: null,
        isLoading: false
    });

    const mutate = useCallback(async (...args) => {
        setState({
            data: null,
            error: null,
            isLoading: true
        });

        try {
            const data = await mutationFn(...args);

            setState({
                data,
                error: null,
                isLoading: false
            });

            // Invalidate cache
            invalidateTags.forEach(tag => queryCache.invalidateByTag(tag));
            invalidateKeys.forEach(key => queryCache.invalidate(key));

            onSuccess?.(data);
            return data;
        } catch (error) {
            setState({
                data: null,
                error,
                isLoading: false
            });
            onError?.(error);
            throw error;
        }
    }, [mutationFn, onSuccess, onError, invalidateTags, invalidateKeys]);

    return {
        ...state,
        mutate,
        isSuccess: !!state.data && !state.error,
        isError: !!state.error
    };
}
