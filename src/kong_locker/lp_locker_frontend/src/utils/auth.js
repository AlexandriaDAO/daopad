import { Actor, HttpAgent } from '@dfinity/agent';
import { AuthClient } from '@dfinity/auth-client';

// Cache for auth client and agents
let authClientInstance = null;
const agentCache = new Map();
const actorCache = new Map();

// Determine if we're in local development
const isLocalDevelopment = window.location.hostname.includes('localhost');

/**
 * Get or create the AuthClient instance
 * @returns {Promise<AuthClient>}
 */
export const getAuthClient = async () => {
  if (authClientInstance) {
    return authClientInstance;
  }
  authClientInstance = await AuthClient.create();
  return authClientInstance;
};

/**
 * Get the current identity from the auth client
 * @returns {Promise<Identity|null>}
 */
export const getIdentity = async () => {
  const client = await getAuthClient();
  const isAuthenticated = await client.isAuthenticated();
  return isAuthenticated ? client.getIdentity() : null;
};

/**
 * Create or get a cached HttpAgent
 * @param {Identity} identity - Optional identity for authenticated calls
 * @returns {Promise<HttpAgent>}
 */
export const getAgent = async (identity = null) => {
  const cacheKey = identity ? identity.getPrincipal().toText() : 'anonymous';
  
  if (agentCache.has(cacheKey)) {
    return agentCache.get(cacheKey);
  }

  const agentOptions = {
    host: isLocalDevelopment ? 'http://localhost:4943' : 'https://ic0.app',
  };

  if (identity) {
    agentOptions.identity = identity;
  }

  const agent = new HttpAgent(agentOptions);

  // Only fetch root key in local development
  if (isLocalDevelopment) {
    try {
      await agent.fetchRootKey();
    } catch (err) {
      console.warn('Unable to fetch root key for local development:', err);
    }
  }

  agentCache.set(cacheKey, agent);
  return agent;
};

/**
 * Create or get a cached actor
 * @param {string} canisterId - The canister ID
 * @param {Function} idlFactory - The IDL factory function
 * @param {Identity} identity - Optional identity for authenticated calls
 * @returns {Promise<Actor>}
 */
export const getActor = async (canisterId, idlFactory, identity = null) => {
  const principalText = identity ? identity.getPrincipal().toText() : 'anonymous';
  const cacheKey = `${canisterId}_${principalText}`;

  if (actorCache.has(cacheKey)) {
    return actorCache.get(cacheKey);
  }

  const agent = await getAgent(identity);
  const actor = Actor.createActor(idlFactory, {
    agent,
    canisterId,
  });

  actorCache.set(cacheKey, actor);
  return actor;
};

/**
 * Clear all cached agents and actors (useful on logout)
 */
export const clearCache = () => {
  agentCache.clear();
  actorCache.clear();
};

/**
 * Login with Internet Identity
 * @param {Function} onSuccess - Callback on successful login
 * @param {Function} onError - Callback on error
 */
export const login = async (onSuccess, onError) => {
  const authClient = await getAuthClient();
  
  await authClient.login({
    identityProvider: 'https://identity.ic0.app',
    onSuccess,
    onError: onError || ((error) => console.error('Login failed:', error)),
    derivationOrigin: "https://yj5ba-aiaaa-aaaap-qkmoa-cai.icp0.io",
    maxTimeToLive: BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000), // 7 days in nanoseconds
  });
};

/**
 * Logout
 */
export const logout = async () => {
  const authClient = await getAuthClient();
  await authClient.logout();
  clearCache();
};