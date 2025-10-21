import { Principal } from '@dfinity/principal';

// Orbit Station types
export interface OrbitStation {
  station_id: string | Principal;
  name: string;
  labels?: string[];
}

// Balance types
export interface Balance {
  token: Principal | string;
  amount: bigint;
  decimals: number;
  symbol: string;
  name?: string;
}
