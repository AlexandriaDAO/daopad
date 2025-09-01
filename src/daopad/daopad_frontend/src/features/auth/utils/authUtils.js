import { HttpAgent } from "@dfinity/agent";
import { AuthClient } from "@dfinity/auth-client";

import {
  daopad_backend,
  createActor as createActorDaopadBackend,
} from "../../../../../declarations/daopad_backend";

const isLocalDevelopment = process.env.DFX_NETWORK !== "ic";

const daopad_backend_canister_id = process.env.CANISTER_ID_DAOPAD_BACKEND;

export const getPrincipal = (client) =>
  client.getIdentity().getPrincipal().toString();

export const getAuthClient = async () => {
  // create new client each time
  // reason for creating new client each time is
  // if the user login has expired it will SPA will not know
  // as same client's ( isAuthenticated ) will always return true even if user session is expired
  const authClient = await AuthClient.create();

  return authClient;
};

const getActor = async (
  canisterId,
  createActorFn,
  defaultActor
) => {
  try {
    const client = await getAuthClient();
    if (await client.isAuthenticated()) {
      const identity = client.getIdentity();

      const agent = await HttpAgent.create({
        identity,
        host: isLocalDevelopment
          ? `http://localhost:4943` // Local development URL
          : "https://ic0.app", // Default to mainnet
      });

      // Fetch root key for certificate validation during development
      // dangerous on mainnet
      if (isLocalDevelopment) {
        await agent.fetchRootKey().catch((err) => {
          console.warn(
            "Unable to fetch root key. Check to ensure that your local replica is running"
          );
          console.error(err);
        });
      }

      return createActorFn(canisterId, {
        agent,
      });
    }
  } catch (error) {
    console.error(`Error initializing actor for ${canisterId}:`, error);
  }
  return defaultActor;
};

export const getDaopadBackendActor = () =>
  getActor(daopad_backend_canister_id, createActorDaopadBackend, daopad_backend);

// Helper function to check if user is authenticated
export const isUserAuthenticated = async () => {
  try {
    const client = await getAuthClient();
    return await client.isAuthenticated();
  } catch (error) {
    console.error("Error checking authentication status:", error);
    return false;
  }
};

// Helper function to validate actor before use
export const validateActor = (actor, actorName) => {
  if (!actor || typeof actor !== 'object') {
    console.warn(`${actorName} actor is undefined or invalid. User may not be authenticated.`);
    return false;
  }
  return true;
};