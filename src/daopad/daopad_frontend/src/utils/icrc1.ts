import { Principal } from '@dfinity/principal';

export interface Icrc1Account {
  owner: Principal;
  subaccount: Uint8Array | null;
}

/**
 * Parses ICRC1 address format: "principal.subaccount-hex"
 * Example: "fec7w-zyaaa-aaaaa-qaffq-cai.886ee66a28974c4c86c8a0bce7eb8706000000000000000000000000000000000000"
 */
export function parseIcrc1Address(address: string): Icrc1Account {
  const parts = address.split('.');

  const owner = Principal.fromText(parts[0]);

  if (parts.length === 1) {
    return { owner, subaccount: null };
  }

  // Convert hex string to Uint8Array
  const subaccount = hexToBytes(parts[1]);

  if (subaccount.length !== 32) {
    throw new Error(`Subaccount must be 32 bytes, got ${subaccount.length}`);
  }

  return { owner, subaccount };
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * Formats subaccount bytes for display
 */
export function formatSubaccount(subaccount: Uint8Array | null): string {
  if (!subaccount) return 'Default (no subaccount)';

  // Convert to hex
  const hex = Array.from(subaccount)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Show first 8 and last 8 chars
  return `${hex.substring(0, 8)}...${hex.substring(hex.length - 8)}`;
}
