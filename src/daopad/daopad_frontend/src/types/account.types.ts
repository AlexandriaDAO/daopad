// Account and address book types
export interface Account {
  id: string;
  name: string;
  blockchain: string;
  standard: string;
  address?: string;
  balance?: bigint;
  decimals?: number;
  symbol?: string;
  metadata?: Record<string, string>[];
  last_modification_timestamp: bigint;
}

export interface AddressEntry {
  id: string;
  blockchain: string;
  address: string;
  address_owner: string;
  standard: string;
  metadata?: Record<string, string>[];
  last_modification_timestamp: bigint;
}
