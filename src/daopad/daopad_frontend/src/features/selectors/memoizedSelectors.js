import { createSelector } from '@reduxjs/toolkit';

/**
 * Memoized selectors for optimized Redux state access
 * Uses reselect (built into Redux Toolkit) to prevent unnecessary recalculations
 */

// ===== Base Selectors =====

// Auth selectors
const selectAuth = state => state.auth || {};
export const selectIdentity = state => selectAuth(state).identity;
export const selectIsAuthenticated = state => !!selectAuth(state).identity;
export const selectAuthError = state => selectAuth(state).error;

// DAO selectors
const selectDao = state => state.dao || {};
export const selectTokens = state => selectDao(state).tokens || [];
export const selectCurrentTokenId = state => selectDao(state).currentTokenId;
export const selectStationMappings = state => selectDao(state).stationMappings || {};

// Station selectors
const selectStation = state => state.station || {};
export const selectStations = state => selectStation(state).stations || {};
export const selectStationLoading = state => selectStation(state).loading || false;
export const selectStationError = state => selectStation(state).error;

// Orbit selectors
const selectOrbit = state => state.orbit || {};
export const selectRequests = state => selectOrbit(state).requests || [];
export const selectRequestsLoading = state => selectOrbit(state).loading || false;
export const selectSelectedDomain = state => selectOrbit(state).selectedDomain || 'All';

// Token selectors
const selectToken = state => state.token || {};
export const selectTokenMetadata = state => selectToken(state).metadata || {};
export const selectTokenBalances = state => selectToken(state).balances || {};

// ===== Memoized Computed Selectors =====

/**
 * Get current selected token
 */
export const selectCurrentToken = createSelector(
    [selectTokens, selectCurrentTokenId],
    (tokens, tokenId) => {
        if (!tokenId || !tokens.length) return null;
        return tokens.find(t => t.canister_id === tokenId) || null;
    }
);

/**
 * Get active station for current token
 */
export const selectActiveStation = createSelector(
    [selectStations, selectCurrentTokenId],
    (stations, tokenId) => {
        if (!tokenId) return null;
        return stations[tokenId] || null;
    }
);

/**
 * Get station mapping for current token
 */
export const selectCurrentStationMapping = createSelector(
    [selectStationMappings, selectCurrentTokenId],
    (mappings, tokenId) => {
        if (!tokenId) return null;
        return mappings[tokenId] || null;
    }
);

/**
 * Get pending requests (Created or Scheduled status)
 */
export const selectPendingRequests = createSelector(
    [selectRequests],
    (requests) => {
        return requests.filter(r =>
            r.status === 'Created' ||
            r.status === 'Scheduled' ||
            r.status === 'Processing'
        );
    }
);

/**
 * Get completed requests
 */
export const selectCompletedRequests = createSelector(
    [selectRequests],
    (requests) => {
        return requests.filter(r =>
            r.status === 'Completed' ||
            r.status === 'Approved' ||
            r.status === 'Executed'
        );
    }
);

/**
 * Get rejected/failed requests
 */
export const selectFailedRequests = createSelector(
    [selectRequests],
    (requests) => {
        return requests.filter(r =>
            r.status === 'Rejected' ||
            r.status === 'Failed' ||
            r.status === 'Cancelled'
        );
    }
);

/**
 * Get requests filtered by domain
 */
export const selectRequestsByDomain = createSelector(
    [selectRequests, selectSelectedDomain],
    (requests, domain) => {
        if (domain === 'All') return requests;
        return requests.filter(r => r.domain === domain);
    }
);

/**
 * Get pending requests count
 */
export const selectPendingRequestsCount = createSelector(
    [selectPendingRequests],
    (pendingRequests) => pendingRequests.length
);

/**
 * Get requests that require user action/voting
 */
export const selectRequestsRequiringAction = createSelector(
    [selectPendingRequests],
    (pendingRequests) => {
        return pendingRequests.filter(r => r.requiresVote || r.requiresApproval);
    }
);

/**
 * Get dashboard data (current token, station, and stats)
 */
export const selectDashboardData = createSelector(
    [
        selectCurrentToken,
        selectActiveStation,
        selectCurrentStationMapping,
        selectPendingRequestsCount,
        selectRequestsRequiringAction
    ],
    (token, station, mapping, pendingCount, actionRequests) => ({
        token,
        station,
        mapping,
        pendingCount,
        requiresAction: actionRequests.length > 0,
        actionRequestsCount: actionRequests.length,
        hasStation: !!station,
        isLinked: mapping?.status === 'linked'
    })
);

/**
 * Get all tokens with their station status
 */
export const selectTokensWithStationStatus = createSelector(
    [selectTokens, selectStationMappings],
    (tokens, mappings) => {
        return tokens.map(token => ({
            ...token,
            stationMapping: mappings[token.canister_id] || null,
            hasStation: !!mappings[token.canister_id]?.stationId,
            stationStatus: mappings[token.canister_id]?.status || 'unknown'
        }));
    }
);

/**
 * Get token metadata for current token
 */
export const selectCurrentTokenMetadata = createSelector(
    [selectTokenMetadata, selectCurrentTokenId],
    (metadata, tokenId) => {
        if (!tokenId) return null;
        return metadata[tokenId] || null;
    }
);

/**
 * Get token balance for current token
 */
export const selectCurrentTokenBalance = createSelector(
    [selectTokenBalances, selectCurrentTokenId],
    (balances, tokenId) => {
        if (!tokenId) return null;
        return balances[tokenId] || null;
    }
);

/**
 * Check if app is ready (has identity and tokens)
 */
export const selectIsAppReady = createSelector(
    [selectIsAuthenticated, selectTokens],
    (isAuthenticated, tokens) => {
        return isAuthenticated && tokens.length > 0;
    }
);

/**
 * Get loading state for dashboard
 */
export const selectDashboardLoading = createSelector(
    [selectStationLoading, selectRequestsLoading],
    (stationLoading, requestsLoading) => {
        return stationLoading || requestsLoading;
    }
);

/**
 * Get all errors across the app
 */
export const selectAllErrors = createSelector(
    [selectAuthError, selectStationError],
    (authError, stationError) => {
        const errors = [];
        if (authError) errors.push({ source: 'auth', error: authError });
        if (stationError) errors.push({ source: 'station', error: stationError });
        return errors;
    }
);

/**
 * Get requests grouped by status
 */
export const selectRequestsByStatus = createSelector(
    [selectRequests],
    (requests) => {
        return requests.reduce((acc, request) => {
            const status = request.status || 'Unknown';
            if (!acc[status]) {
                acc[status] = [];
            }
            acc[status].push(request);
            return acc;
        }, {});
    }
);

/**
 * Get requests statistics
 */
export const selectRequestsStats = createSelector(
    [selectRequests, selectPendingRequests, selectCompletedRequests, selectFailedRequests],
    (all, pending, completed, failed) => ({
        total: all.length,
        pending: pending.length,
        completed: completed.length,
        failed: failed.length,
        pendingPercentage: all.length > 0 ? (pending.length / all.length) * 100 : 0,
        completedPercentage: all.length > 0 ? (completed.length / all.length) * 100 : 0,
        failedPercentage: all.length > 0 ? (failed.length / all.length) * 100 : 0
    })
);
