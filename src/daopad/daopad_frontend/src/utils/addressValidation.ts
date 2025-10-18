import { decodeIcrcAccount } from '@dfinity/ledger-icrc';

// Address format types
export const AddressFormat = {
  ICPAccountIdentifier: 'icp_account_identifier',
  ICRC1Account: 'icrc1_account',
};

// Blockchain types
export const BlockchainType = {
  InternetComputer: 'icp',
};

/**
 * Validates if a string is a valid SHA256 hash (ICP Account Identifier)
 * @param {string} address - The address to validate
 * @returns {boolean} - True if valid SHA256 format
 */
function isValidSha256(address) {
  // Check if it's a 64 character hex string
  return /^[a-fA-F0-9]{64}$/.test(address);
}

/**
 * Validates if a string is a valid ICRC1 account address
 * @param {string} address - The address to validate
 * @returns {boolean} - True if valid ICRC1 format
 */
function isValidICRC1Address(address) {
  try {
    decodeIcrcAccount(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Detects the address format for a given blockchain
 * @param {string} blockchain - The blockchain type
 * @param {string} address - The address to validate
 * @returns {string|undefined} - The detected address format or undefined if invalid
 */
export function detectAddressFormat(blockchain, address) {
  switch (blockchain) {
    case BlockchainType.InternetComputer:
      if (isValidSha256(address)) {
        return AddressFormat.ICPAccountIdentifier;
      } else if (isValidICRC1Address(address)) {
        return AddressFormat.ICRC1Account;
      }
      return undefined;
    default:
      throw new Error(`Blockchain not supported: ${blockchain}`);
  }
}

/**
 * Validates an address for a specific blockchain
 * @param {string} blockchain - The blockchain type
 * @param {string} address - The address to validate
 * @returns {boolean|string} - True if valid, error message if invalid
 */
export function validateAddress(blockchain, address) {
  if (!address || address.trim() === '') {
    return 'Address is required';
  }

  try {
    const format = detectAddressFormat(blockchain, address);
    if (format) {
      return true;
    }
    return 'Invalid address format';
  } catch (error) {
    return error.message || 'Invalid address';
  }
}

/**
 * Determines the appropriate token standard based on address format
 * @param {string} addressFormat - The detected address format
 * @param {Array} supportedStandards - Array of supported standards for the asset
 * @returns {string|undefined} - The appropriate token standard
 */
export function getStandardForAddressFormat(addressFormat, supportedStandards = []) {
  // Map address formats to their compatible token standards
  const formatToStandards = {
    [AddressFormat.ICPAccountIdentifier]: ['icp_ledger'],
    [AddressFormat.ICRC1Account]: ['icrc1'],
  };

  const compatibleStandards = formatToStandards[addressFormat] || [];

  // Find the first supported standard that matches
  return supportedStandards.find(standard =>
    compatibleStandards.includes(standard)
  );
}

/**
 * Shortens an ICRC1 address for display
 * @param {string} address - The ICRC1 address to shorten
 * @returns {string} - The shortened address
 */
export function shortenICRC1Address(address) {
  try {
    const account = decodeIcrcAccount(address);
    const principal = account.owner.toText();

    // If no subaccount or all zeros, just show the principal
    if (!account.subaccount || account.subaccount.every(b => b === 0)) {
      if (principal.length <= 32) {
        return principal;
      }
      // Shorten long principals
      return `${principal.slice(0, 5)}...${principal.slice(-5)}`;
    }

    // Show principal with subaccount indicator
    const shortPrincipal = principal.length > 20
      ? `${principal.slice(0, 5)}...${principal.slice(-5)}`
      : principal;
    return `${shortPrincipal}[sub]`;
  } catch {
    // If not a valid ICRC1 address, return as is
    return address;
  }
}

/**
 * Formats an address for display based on its type
 * @param {string} address - The address to format
 * @param {string} blockchain - The blockchain type
 * @returns {string} - The formatted address
 */
export function formatAddressForDisplay(address, blockchain) {
  const format = detectAddressFormat(blockchain, address);

  switch (format) {
    case AddressFormat.ICRC1Account:
      return shortenICRC1Address(address);
    case AddressFormat.ICPAccountIdentifier:
      // Shorten account identifier
      if (address.length > 16) {
        return `${address.slice(0, 8)}...${address.slice(-8)}`;
      }
      return address;
    default:
      return address;
  }
}