import { Principal } from '@dfinity/principal';
import type { Balance } from './balance.types';

// Orbit Station types
export interface OrbitStation {
  station_id: string | Principal;
  name: string;
  labels?: string[];
}

// Re-export Balance from balance.types.ts for convenience
export type { Balance };
