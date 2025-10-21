import { Principal } from '@dfinity/principal';
import type { Identity } from '@dfinity/agent';
import type { Token } from './token.types';
import type { VotingPower } from './proposal.types';
import type { Proposal } from './proposal.types';

// LP Position (Kong Locker related)
export interface LPPosition {
  symbol: string;
  pool_id: string;
  pool_symbol: string;
  lp_token_amount: bigint;
  liquidity_usd: number;
  token_0: string;
  token_1: string;
  token_0_amount: bigint;
  token_1_amount: bigint;
}

// Auth types
export interface AuthState {
  isAuthenticated: boolean;
  principal: Principal | null;
  identity: Identity | null;
  votingPower: bigint;
}

// DAO Status
export interface DAOStatus {
  has_station: boolean;
  station_id?: Principal | string;
  is_valid: boolean;
  validation_errors?: string[];
}

// Component prop types
export interface TokenDashboardProps {
  token: Token;
  tokens?: Token[] | null;
  activeTokenIndex?: number;
  onTokenChange?: ((index: number) => void) | null;
  tokenVotingPowers?: Record<string, VotingPower[]> | null;
  identity: Identity | null;
  votingPower: bigint;
  lpPositions?: LPPosition[];
  onRefresh?: () => void;
}

export interface ProposalCardProps {
  proposal: Proposal;
  votingPower: bigint;
  totalVotingPower: bigint;
  onVote?: (proposalId: string, vote: boolean) => Promise<void>;
  onViewDetails?: (proposal: Proposal) => void;
}

// Navigation types
export interface NavItem {
  title: string;
  href: string;
  icon?: any;
  disabled?: boolean;
  external?: boolean;
}

// Filter types
export interface FilterState {
  search?: string;
  status?: string[];
  type?: string[];
  blockchain?: string[];
}

// Pagination types
export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalItems: number;
}
