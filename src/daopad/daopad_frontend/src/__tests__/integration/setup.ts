import { HttpAgent, Actor } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { idlFactory } from '@/declarations/daopad_backend';

// Mainnet configuration
export const MAINNET_HOST = 'https://ic0.app';
export const BACKEND_CANISTER = 'lwsav-iiaaa-aaaap-qp2qq-cai';
export const ALEX_TOKEN_ID = 'ysy5f-2qaaa-aaaap-qkmmq-cai';
export const ORBIT_STATION_ID = 'fec7w-zyaaa-aaaaa-qaffq-cai';

/**
 * Create agent pointing to mainnet
 * No authentication needed for public queries
 */
export async function createMainnetAgent(): Promise<HttpAgent> {
  const agent = await HttpAgent.create({
    host: MAINNET_HOST
  });

  // Note: We don't call fetchRootKey() for mainnet
  // Only needed for local development

  return agent;
}

/**
 * Create backend actor for mainnet calls
 */
export async function createBackendActor(): Promise<any> {
  const agent = await createMainnetAgent();
  return Actor.createActor(idlFactory, {
    agent,
    canisterId: BACKEND_CANISTER,
  });
}

/**
 * Helper to convert BigInt to number for logging
 */
export function serializeBigInt(obj: any): any {
  return JSON.parse(JSON.stringify(obj, (_, v) =>
    typeof v === 'bigint' ? v.toString() : v
  ));
}

/**
 * Helper to log response structure in detail
 */
export function logResponse(label: string, response: any) {
  console.log(`\n=== ${label} ===`);
  console.log(JSON.stringify(response, (_, v) =>
    typeof v === 'bigint' ? `${v.toString()}n` : v
  , 2));
  console.log(`=== END ${label} ===\n`);
}
