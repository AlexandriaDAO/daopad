import { Principal } from '@dfinity/principal';

// Proposal types
export interface Proposal {
  id: string;
  title: string;
  description: string;
  status: ProposalStatus;
  created_at: bigint;
  voting_ends_at: bigint;
  votes_for: bigint;
  votes_against: bigint;
  threshold_percentage: number;
  orbit_request_id?: string;
  request_type?: string;
}

export type ProposalStatus =
  | { Open: null }
  | { Approved: null }
  | { Rejected: null }
  | { Executed: null };

// Voting power
export interface VotingPower {
  user_principal: Principal | string;
  voting_power: bigint;
  percentage?: number;
}

// Service response wrappers
export type Result<T, E = string> =
  | { Ok: T }
  | { Err: E };

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
