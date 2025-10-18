# 🤖 AUTONOMOUS PR ORCHESTRATOR - DO NOT SKIP

**You are an autonomous PR orchestrator. Your ONLY job is to implement this plan and create a PR.**

## Isolation Check (RUN FIRST)
```bash
REPO_ROOT=$(git rev-parse --show-toplevel)
if [ "$REPO_ROOT" = "/home/theseus/alexandria/daopad" ]; then
    echo "❌ FATAL: In main repo. Must be in worktree."
    echo "Worktree: /home/theseus/alexandria/daopad-typescript-migration/src/daopad"
    exit 1
fi
echo "✅ In isolated worktree: $REPO_ROOT"
```

## Your Autonomous Workflow (NO QUESTIONS ALLOWED)
1. **Verify isolation** - You must be in worktree: `/home/theseus/alexandria/daopad-typescript-migration/src/daopad`
2. **Implement feature** - Follow plan sections below
3. **Build & Deploy**:
   - Frontend changes:
     ```bash
     cd daopad_frontend
     npm run build
     cd ..
     ./deploy.sh --network ic --frontend-only
     ```
4. **Create PR** (MANDATORY):
   ```bash
   git add .
   git commit -m "Feature: Convert JavaScript to TypeScript"
   git push -u origin feature/typescript-migration
   gh pr create --title "[Feature]: Complete TypeScript Migration" --body "Implements TYPESCRIPT_MIGRATION_PLAN.md

## Summary
- Converts all 200 JavaScript files to TypeScript
- Adds comprehensive type definitions
- Maintains all existing functionality
- Improves type safety and developer experience

## Testing
- ✅ Build passes with strict TypeScript checks
- ✅ All existing tests pass
- ✅ Frontend deploys successfully to mainnet
- ✅ No runtime errors in production"
   ```
5. **Iterate autonomously**:
   - FOR i=1 to 5:
     - Check review: `gh pr view [NUM] --json comments`
     - Count P0 issues
     - IF P0 > 0: Fix immediately, commit, push, sleep 300s, continue
     - IF P0 = 0: Report success, EXIT
   - After 5 iterations: Escalate to human

## CRITICAL RULES
- ❌ NO questions ("should I?", "want me to?", "is it done?")
- ❌ NO skipping PR creation - it's MANDATORY
- ❌ NO stopping after implementation - create PR immediately
- ✅ After sleep: IMMEDIATELY continue (no pause)
- ✅ ONLY stop at: approved, max iterations, or error

**Branch:** `feature/typescript-migration`
**Worktree:** `/home/theseus/alexandria/daopad-typescript-migration/src/daopad`

---

# TypeScript Migration Implementation Plan

## Task Classification
**Type:** REFACTORING - Improve existing code quality, maintainability, and type safety through systematic conversion from JavaScript to TypeScript.

## Current State Analysis

### File Inventory
- **Total JavaScript files:** 200+ (.js and .jsx files)
- **Existing TypeScript files:** 3 (.d.ts declaration files only)
  - `src/generated/station/index.d.ts`
  - `src/generated/station/station.did.d.ts`
  - `src/vite-env.d.ts`
- **TypeScript already installed:** Version 5.1.3 (devDependencies)
- **Missing:** tsconfig.json (needs to be created)

### File Categories to Convert

#### 1. Core Application (3 files)
- `src/App.jsx`
- `src/main.jsx`
- `src/index.jsx`

#### 2. Routes (2 files)
- `src/routes/Homepage.jsx`
- `src/routes/AppRoute.jsx`

#### 3. Components (~160 files)
**UI Components (shadcn/ui - 20 files):**
- `src/components/ui/alert.jsx`
- `src/components/ui/badge.jsx`
- `src/components/ui/button.jsx`
- `src/components/ui/calendar.jsx`
- `src/components/ui/card.jsx`
- `src/components/ui/checkbox.jsx`
- `src/components/ui/collapsible.jsx`
- `src/components/ui/dialog.jsx`
- `src/components/ui/dropdown-menu.jsx`
- `src/components/ui/EmptyState.jsx`
- `src/components/ui/executive-card.jsx`
- `src/components/ui/fallback-loader.jsx`
- `src/components/ui/form.jsx`
- `src/components/ui/input.jsx`
- `src/components/ui/label.jsx`
- `src/components/ui/loading-shimmer.jsx`
- `src/components/ui/popover.jsx`
- `src/components/ui/progress.jsx`
- `src/components/ui/radio-group.jsx`
- `src/components/ui/select.jsx`
- `src/components/ui/separator.jsx`
- `src/components/ui/sheet.jsx`
- `src/components/ui/skeleton.jsx`
- `src/components/ui/switch.jsx`
- `src/components/ui/table.jsx`
- `src/components/ui/textarea.jsx`
- `src/components/ui/toaster.jsx`
- `src/components/ui/tooltip.jsx`

**Orbit Components (~60 files):**
- Treasury management components
- Request management components
- Account management components
- Dashboard components
- Policy management components

**Feature Components (~50 files):**
- Token dashboard
- Proposals
- Permissions
- Security
- Canisters
- Address book

**Error Boundaries (5 files):**
- `src/components/errors/ErrorBoundary.jsx`
- `src/components/errors/ErrorFallback.jsx`
- `src/components/errors/LazyLoadErrorBoundary.jsx`
- `src/components/errors/RouteErrorBoundary.jsx`
- `src/components/common/BalanceErrorBoundary.jsx`

#### 4. Services (~15 files)
- `src/services/auth.js`
- `src/services/balanceService.js`
- `src/services/kongLockerService.js`
- `src/services/addressBookService.js`
- `src/services/orbitStation.js`
- `src/services/orbitStation.did.js`
- `src/services/orbit/stationClient.js`
- `src/services/orbit/stationService.js`

#### 5. State Management (~8 files)
**Redux Slices:**
- `src/features/auth/authSlice.js`
- `src/features/dao/daoSlice.js`
- `src/features/station/stationSlice.js`
- `src/state/balance/balanceSlice.js`
- `src/state/balance/balanceThunks.js`

**Utilities:**
- `src/features/auth/utils/authUtils.js`

#### 6. Hooks (~8 files)
- `src/hooks/useActiveStation.js`
- `src/hooks/useDebounce.js`
- `src/hooks/useFilter.js`
- `src/hooks/useIdentity.jsx`
- `src/hooks/useLogout.jsx`
- `src/hooks/usePagination.js`
- `src/hooks/useStationService.js`
- `src/hooks/use-toast.js`

#### 7. Utilities (~10 files)
- `src/utils/addressValidation.js`
- `src/utils/orbit-helpers.js`
- `src/utils/requestDomains.js`
- `src/utils/serialization.js`
- `src/lib/utils.js`

#### 8. Providers (~3 files)
- `src/providers/AuthProvider/IIProvider.jsx`

#### 9. Test Files (~5 files)
- `src/setupTests.js`
- `src/tests/App.test.jsx`
- `src/services/__tests__/orbitEncoding.test.js`

### Current Build Configuration
**Vite Configuration:** `vite.config.js`
- Uses `@vitejs/plugin-react`
- Already configured for modern builds
- Has path aliases (@, declarations)
- Source maps enabled

**Package.json:**
- TypeScript 5.1.3 in devDependencies
- Build script: `npm run build`
- Format script supports ts/tsx

### Dependencies with TypeScript Support
✅ All major dependencies have TypeScript types:
- `@dfinity/*` packages - Native TypeScript
- `react`, `react-dom` - `@types/react`, `@types/react-dom`
- `@reduxjs/toolkit` - Native TypeScript
- `react-router-dom` - Native TypeScript
- `@radix-ui/*` - Native TypeScript
- `react-hook-form` - Native TypeScript
- `zod` - Native TypeScript

## Migration Strategy

### Phase 1: Foundation Setup
Create TypeScript configuration and type definitions that will support all subsequent conversions.

### Phase 2: Bottom-Up Conversion
Convert files starting from utilities and types, moving up to components and routes. This ensures that when we convert a component, its dependencies already have types.

### Phase 3: Validation
Ensure all conversions maintain functionality and improve type safety.

## Implementation Plan

### Step 1: Create tsconfig.json

**File:** `daopad_frontend/tsconfig.json` (NEW)

```json
// PSEUDOCODE: TypeScript configuration for React + Vite
{
  "compilerOptions": {
    // Target modern browsers (matches Vite defaults)
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",

    // Enable strict type checking
    "strict": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitAny": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,

    // Module resolution
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowImportingTsExtensions": true,
    "isolatedModules": true,

    // Emit settings (Vite handles transpilation)
    "noEmit": true,
    "jsx": "react-jsx",

    // Interop
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,

    // Path mappings (match vite.config.js)
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "declarations/*": ["./src/declarations/*"]
    },

    // Skip lib checking for faster builds
    "skipLibCheck": true
  },
  "include": [
    "src/**/*.ts",
    "src/**/*.tsx",
    "src/**/*.js",
    "src/**/*.jsx"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "build"
  ],
  "references": [
    { "path": "./tsconfig.node.json" }
  ]
}
```

### Step 2: Create tsconfig.node.json

**File:** `daopad_frontend/tsconfig.node.json` (NEW)

```json
// PSEUDOCODE: TypeScript config for build tooling
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "noEmit": true
  },
  "include": [
    "vite.config.js",
    "postcss.config.js",
    "tailwind.config.js"
  ]
}
```

### Step 3: Create Global Type Definitions

**File:** `daopad_frontend/src/types/global.d.ts` (NEW)

```typescript
// PSEUDOCODE: Global type definitions

// Environment variables
declare global {
  interface Window {
    ic?: {
      plug?: {
        requestConnect: () => Promise<void>;
        isConnected: () => Promise<boolean>;
        // Add other Plug wallet methods
      };
    };
  }
}

// Vite environment variables
interface ImportMetaEnv {
  readonly CANISTER_ID_DAOPAD_BACKEND?: string;
  readonly CANISTER_ID_DAOPAD_FRONTEND?: string;
  readonly DFX_NETWORK?: string;
  // Add other env vars
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

export {};
```

### Step 4: Create Shared Type Definitions

**File:** `daopad_frontend/src/types/index.ts` (NEW)

```typescript
// PSEUDOCODE: Centralized type exports

import { Principal } from '@dfinity/principal';

// Token types
export interface Token {
  canister_id: Principal;
  symbol: string;
  name: string;
  decimals: number;
  fee: bigint;
  logo?: string;
}

// Orbit Station types
export interface OrbitStation {
  station_id: Principal;
  name: string;
  labels?: string[];
}

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
}

export type ProposalStatus =
  | { Open: null }
  | { Approved: null }
  | { Rejected: null }
  | { Executed: null };

// Request types (from Orbit)
export interface OrbitRequest {
  id: string;
  title: string;
  operation: RequestOperation;
  status: RequestStatus;
  created_at: bigint;
  // ... other fields based on Orbit Station types
}

export type RequestOperation =
  | { Transfer: TransferOperation }
  | { AddUser: AddUserOperation }
  | { EditUser: EditUserOperation }
  // ... other operation types
  ;

export type RequestStatus =
  | { Created: null }
  | { Approved: null }
  | { Rejected: null }
  | { Processing: null }
  | { Completed: null }
  | { Failed: { reason: string } }
  ;

// Balance types
export interface Balance {
  token: Principal;
  amount: bigint;
  decimals: number;
  symbol: string;
}

// Voting power
export interface VotingPower {
  user_principal: Principal;
  voting_power: bigint;
  percentage: number;
}

// Auth types
export interface AuthState {
  isAuthenticated: boolean;
  principal: Principal | null;
  identity: any | null; // Use proper Identity type from @dfinity/agent
  votingPower: bigint;
}

// Service response wrappers
export type Result<T, E = string> =
  | { Ok: T }
  | { Err: E };

// Component prop types will be defined per component
```

### Step 5: Convert Utility Files (Bottom Layer)

**File:** `src/lib/utils.ts` (MODIFY: .js → .ts)

```typescript
// PSEUDOCODE: Type-safe utility functions
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  // Combine and merge Tailwind classes
  return twMerge(clsx(inputs));
}

// Add type annotations to all existing utility functions
export function formatBalance(
  amount: bigint,
  decimals: number,
  maxDecimals?: number
): string {
  // Format balance with proper decimal handling
  // Return formatted string
}

export function formatTimestamp(timestamp: bigint): string {
  // Convert bigint timestamp to formatted date
  // Return formatted date string
}

export function truncatePrincipal(
  principal: string,
  startChars: number = 6,
  endChars: number = 4
): string {
  // Truncate principal for display
  // Return truncated string
}
```

**File:** `src/utils/addressValidation.ts` (MODIFY: .js → .ts)

```typescript
// PSEUDOCODE: Type-safe address validation
import { Principal } from '@dfinity/principal';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  principal?: Principal;
}

export function validatePrincipal(input: string): ValidationResult {
  try {
    // Attempt to parse as Principal
    const principal = Principal.fromText(input);
    return {
      isValid: true,
      principal
    };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Invalid principal'
    };
  }
}

export function validateAccountId(input: string): ValidationResult {
  // Validate account ID format
  // Return validation result
}

export function validateICPAddress(input: string): ValidationResult {
  // Validate ICP address format
  // Return validation result
}
```

**File:** `src/utils/serialization.ts` (MODIFY: .js → .ts)

```typescript
// PSEUDOCODE: Type-safe serialization utilities
import { Principal } from '@dfinity/principal';

export function serializePrincipal(principal: Principal): string {
  return principal.toText();
}

export function deserializePrincipal(text: string): Principal {
  return Principal.fromText(text);
}

export function serializeBigInt(value: bigint): string {
  return value.toString();
}

export function deserializeBigInt(value: string): bigint {
  return BigInt(value);
}
```

**File:** `src/utils/orbit-helpers.ts` (MODIFY: .js → .ts)

```typescript
// PSEUDOCODE: Type-safe Orbit Station helpers
import type { OrbitRequest, RequestOperation, RequestStatus } from '@/types';

export function getOperationName(operation: RequestOperation): string {
  // Extract operation name from variant
  // Return string representation
}

export function getStatusColor(status: RequestStatus): string {
  // Map status to color class
  // Return Tailwind color class
}

export function isRequestPending(request: OrbitRequest): boolean {
  // Check if request is in pending state
  // Return boolean
}

export function canUserApprove(
  request: OrbitRequest,
  userPrincipal: Principal
): boolean {
  // Check if user has permission to approve
  // Return boolean
}
```

**File:** `src/utils/requestDomains.ts` (MODIFY: .js → .ts)

```typescript
// PSEUDOCODE: Request domain categorization
import type { RequestOperation } from '@/types';

export type RequestDomain =
  | 'treasury'
  | 'governance'
  | 'members'
  | 'canisters'
  | 'system';

export function getRequestDomain(operation: RequestOperation): RequestDomain {
  // Categorize operation into domain
  // Return domain type
}

export function getRequestDomainLabel(domain: RequestDomain): string {
  // Get human-readable label for domain
  // Return label string
}

export function getRequestDomainIcon(domain: RequestDomain): string {
  // Get icon name for domain
  // Return icon identifier
}
```

### Step 6: Convert Hooks (Service Layer)

**File:** `src/hooks/useDebounce.ts` (MODIFY: .js → .ts)

```typescript
// PSEUDOCODE: Type-safe debounce hook
import { useEffect, useState } from 'react';

export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up debounce timer
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup timer on unmount or value change
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
```

**File:** `src/hooks/usePagination.ts` (MODIFY: .js → .ts)

```typescript
// PSEUDOCODE: Type-safe pagination hook
import { useState, useMemo } from 'react';

export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalItems: number;
}

export interface PaginationResult<T> {
  paginatedData: T[];
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  setPageSize: (size: number) => void;
}

export function usePagination<T>(
  data: T[],
  initialPageSize: number = 10
): PaginationResult<T> {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Calculate pagination values
  const totalPages = Math.ceil(data.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = data.slice(startIndex, endIndex);

  // Return pagination interface
  return {
    paginatedData,
    currentPage,
    totalPages,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
    goToPage: (page) => setCurrentPage(Math.max(1, Math.min(page, totalPages))),
    nextPage: () => setCurrentPage(prev => Math.min(prev + 1, totalPages)),
    prevPage: () => setCurrentPage(prev => Math.max(prev - 1, 1)),
    setPageSize
  };
}
```

**File:** `src/hooks/useFilter.ts` (MODIFY: .js → .ts)

```typescript
// PSEUDOCODE: Type-safe filter hook
import { useState, useMemo } from 'react';

export interface FilterConfig<T> {
  key: keyof T;
  predicate: (item: T, filterValue: any) => boolean;
}

export function useFilter<T, F extends Record<string, any>>(
  data: T[],
  initialFilters: F
) {
  const [filters, setFilters] = useState<F>(initialFilters);

  const filteredData = useMemo(() => {
    // Apply all active filters
    return data.filter(item => {
      // Check each filter predicate
      // Return true if item passes all filters
    });
  }, [data, filters]);

  const updateFilter = <K extends keyof F>(key: K, value: F[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters(initialFilters);
  };

  return {
    filteredData,
    filters,
    updateFilter,
    resetFilters
  };
}
```

**File:** `src/hooks/use-toast.ts` (MODIFY: .js → .ts)

```typescript
// PSEUDOCODE: Type-safe toast notifications hook
import { toast as sonnerToast } from 'sonner';

export interface ToastOptions {
  title?: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function useToast() {
  const toast = (options: ToastOptions) => {
    // Show toast with options
    sonnerToast(options.title, {
      description: options.description,
      duration: options.duration,
      action: options.action
    });
  };

  return {
    toast,
    success: (message: string, description?: string) => {
      sonnerToast.success(message, { description });
    },
    error: (message: string, description?: string) => {
      sonnerToast.error(message, { description });
    },
    warning: (message: string, description?: string) => {
      sonnerToast.warning(message, { description });
    },
    info: (message: string, description?: string) => {
      sonnerToast.info(message, { description });
    }
  };
}
```

**File:** `src/hooks/useIdentity.tsx` (MODIFY: .jsx → .tsx)

```typescript
// PSEUDOCODE: Type-safe identity hook
import { useContext } from 'react';
import type { Identity } from '@dfinity/agent';
import type { Principal } from '@dfinity/principal';

export interface IdentityContextValue {
  identity: Identity | null;
  principal: Principal | null;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

export function useIdentity(): IdentityContextValue {
  // Get identity from context
  // Return typed identity interface
}
```

**File:** `src/hooks/useLogout.tsx` (MODIFY: .jsx → .tsx)

```typescript
// PSEUDOCODE: Type-safe logout hook
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';

export function useLogout() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const logout = useCallback(async () => {
    try {
      // Clear auth state
      // Clear Redux state
      // Navigate to homepage
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, [navigate, dispatch]);

  return { logout };
}
```

**File:** `src/hooks/useActiveStation.ts` (MODIFY: .js → .ts)

```typescript
// PSEUDOCODE: Type-safe active station hook
import { useSelector } from 'react-redux';
import type { RootState } from '@/state/store';
import type { OrbitStation } from '@/types';

export function useActiveStation(): OrbitStation | null {
  // Get active station from Redux
  const station = useSelector((state: RootState) => state.station.activeStation);
  return station;
}
```

**File:** `src/hooks/useStationService.ts` (MODIFY: .js → .ts)

```typescript
// PSEUDOCODE: Type-safe station service hook
import { useMemo } from 'react';
import { StationService } from '@/services/orbit/stationService';
import type { Principal } from '@dfinity/principal';

export function useStationService(stationId: Principal | null) {
  const service = useMemo(() => {
    if (!stationId) return null;
    return new StationService(stationId);
  }, [stationId]);

  return service;
}
```

### Step 7: Convert Services (API Layer)

**File:** `src/services/auth.ts` (MODIFY: .js → .ts)

```typescript
// PSEUDOCODE: Type-safe authentication service
import { AuthClient } from '@dfinity/auth-client';
import type { Identity } from '@dfinity/agent';
import type { Principal } from '@dfinity/principal';

export interface AuthResult {
  identity: Identity;
  principal: Principal;
}

export class AuthService {
  private client: AuthClient | null = null;

  async initialize(): Promise<void> {
    // Initialize auth client
    this.client = await AuthClient.create();
  }

  async login(): Promise<AuthResult> {
    // Perform Internet Identity login
    // Return identity and principal
  }

  async logout(): Promise<void> {
    // Clear auth session
    await this.client?.logout();
  }

  async isAuthenticated(): Promise<boolean> {
    // Check if user is authenticated
    return await this.client?.isAuthenticated() ?? false;
  }

  async getIdentity(): Promise<Identity | null> {
    // Get current identity
    return this.client?.getIdentity() ?? null;
  }
}

export const authService = new AuthService();
```

**File:** `src/services/balanceService.ts` (MODIFY: .js → .ts)

```typescript
// PSEUDOCODE: Type-safe balance service
import { Principal } from '@dfinity/principal';
import type { Balance } from '@/types';

export class BalanceService {
  async getTokenBalance(
    tokenCanisterId: Principal,
    accountPrincipal: Principal
  ): Promise<Balance> {
    // Query token canister for balance
    // Return typed balance
  }

  async getAllBalances(
    accountPrincipal: Principal,
    tokenCanisters: Principal[]
  ): Promise<Balance[]> {
    // Get balances for all tokens
    // Return array of balances
  }

  async refreshBalance(
    tokenCanisterId: Principal,
    accountPrincipal: Principal
  ): Promise<Balance> {
    // Force refresh of balance
    // Return updated balance
  }
}

export const balanceService = new BalanceService();
```

**File:** `src/services/kongLockerService.ts` (MODIFY: .js → .ts)

```typescript
// PSEUDOCODE: Type-safe Kong Locker service
import { Principal } from '@dfinity/principal';
import type { VotingPower } from '@/types';

export interface LockInfo {
  user: Principal;
  locked_amount: bigint;
  locked_at: bigint;
  lock_canister: Principal;
}

export class KongLockerService {
  private readonly lockerCanisterId: Principal;

  constructor() {
    this.lockerCanisterId = Principal.fromText('eazgb-giaaa-aaaap-qqc2q-cai');
  }

  async getUserVotingPower(userPrincipal: Principal): Promise<bigint> {
    // Query Kong Locker for user's voting power
    // Return voting power as bigint
  }

  async getAllVotingPowers(): Promise<VotingPower[]> {
    // Get all voting powers from Kong Locker
    // Return array of voting powers
  }

  async getUserLockInfo(userPrincipal: Principal): Promise<LockInfo | null> {
    // Get lock information for user
    // Return lock info or null if not found
  }
}

export const kongLockerService = new KongLockerService();
```

**File:** `src/services/addressBookService.ts` (MODIFY: .js → .ts)

```typescript
// PSEUDOCODE: Type-safe address book service
import { Principal } from '@dfinity/principal';

export interface AddressEntry {
  id: string;
  blockchain: string;
  address: string;
  label: string;
  created_at: bigint;
}

export class AddressBookService {
  async getAddresses(stationId: Principal): Promise<AddressEntry[]> {
    // Get all address book entries
    // Return typed array
  }

  async addAddress(
    stationId: Principal,
    entry: Omit<AddressEntry, 'id' | 'created_at'>
  ): Promise<AddressEntry> {
    // Add new address to book
    // Return created entry
  }

  async removeAddress(
    stationId: Principal,
    entryId: string
  ): Promise<void> {
    // Remove address from book
  }

  async updateAddress(
    stationId: Principal,
    entryId: string,
    updates: Partial<Omit<AddressEntry, 'id' | 'created_at'>>
  ): Promise<AddressEntry> {
    // Update address entry
    // Return updated entry
  }
}

export const addressBookService = new AddressBookService();
```

**File:** `src/services/orbit/stationService.ts` (MODIFY: .js → .ts)

```typescript
// PSEUDOCODE: Type-safe Orbit Station service
import { Principal } from '@dfinity/principal';
import type { OrbitRequest, Balance } from '@/types';

export class StationService {
  private readonly stationId: Principal;
  private actor: any; // Use proper Station actor type from declarations

  constructor(stationId: Principal) {
    this.stationId = stationId;
  }

  async initialize(): Promise<void> {
    // Initialize actor with identity
    // Set up connection to station canister
  }

  async listRequests(filters?: {
    statuses?: string[];
    limit?: number;
    offset?: number;
  }): Promise<OrbitRequest[]> {
    // Query station for requests
    // Return typed requests
  }

  async getRequest(requestId: string): Promise<OrbitRequest | null> {
    // Get single request by ID
    // Return request or null
  }

  async submitVote(
    requestId: string,
    approve: boolean
  ): Promise<void> {
    // Submit vote on request
  }

  async getTreasuryBalance(): Promise<Balance[]> {
    // Get all treasury balances
    // Return array of balances
  }

  async createTransferRequest(
    amount: bigint,
    recipient: string,
    memo?: string
  ): Promise<string> {
    // Create transfer request
    // Return request ID
  }
}
```

**File:** `src/services/orbit/stationClient.ts` (MODIFY: .js → .ts)

```typescript
// PSEUDOCODE: Type-safe station client factory
import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import type { Identity } from '@dfinity/agent';

export interface StationClientConfig {
  stationId: Principal;
  identity?: Identity;
  host?: string;
}

export class StationClient {
  private agent: HttpAgent;
  private actor: any; // Use proper actor type

  constructor(config: StationClientConfig) {
    // Create agent with identity
    this.agent = new HttpAgent({
      identity: config.identity,
      host: config.host ?? 'https://ic0.app'
    });

    // Create actor
    this.actor = Actor.createActor(idlFactory, {
      agent: this.agent,
      canisterId: config.stationId
    });
  }

  async call<T>(method: string, args: any[]): Promise<T> {
    // Make typed canister call
    // Return result
  }

  getActor(): any {
    return this.actor;
  }
}
```

### Step 8: Convert Redux State Management

**File:** `src/state/store.ts` (NEW)

```typescript
// PSEUDOCODE: Type-safe Redux store configuration
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/features/auth/authSlice';
import daoReducer from '@/features/dao/daoSlice';
import stationReducer from '@/features/station/stationSlice';
import balanceReducer from '@/state/balance/balanceSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    dao: daoReducer,
    station: stationReducer,
    balance: balanceReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore non-serializable values (bigint, Principal)
        ignoredActions: ['auth/setIdentity', 'balance/setBalance'],
        ignoredPaths: ['auth.identity', 'auth.principal']
      }
    })
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

**File:** `src/state/hooks.ts` (NEW)

```typescript
// PSEUDOCODE: Type-safe Redux hooks
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from './store';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

**File:** `src/features/auth/authSlice.ts` (MODIFY: .js → .ts)

```typescript
// PSEUDOCODE: Type-safe auth slice
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Principal } from '@dfinity/principal';
import type { Identity } from '@dfinity/agent';

export interface AuthState {
  isAuthenticated: boolean;
  principal: Principal | null;
  identity: Identity | null;
  votingPower: bigint;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  principal: null,
  identity: null,
  votingPower: BigInt(0),
  isLoading: false,
  error: null
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthenticated(state, action: PayloadAction<{
      principal: Principal;
      identity: Identity;
    }>) {
      state.isAuthenticated = true;
      state.principal = action.payload.principal;
      state.identity = action.payload.identity;
      state.error = null;
    },
    setVotingPower(state, action: PayloadAction<bigint>) {
      state.votingPower = action.payload;
    },
    clearAuth(state) {
      state.isAuthenticated = false;
      state.principal = null;
      state.identity = null;
      state.votingPower = BigInt(0);
      state.error = null;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    setError(state, action: PayloadAction<string>) {
      state.error = action.payload;
    }
  }
});

export const {
  setAuthenticated,
  setVotingPower,
  clearAuth,
  setLoading,
  setError
} = authSlice.actions;

export default authSlice.reducer;
```

**File:** `src/features/dao/daoSlice.ts` (MODIFY: .js → .ts)

```typescript
// PSEUDOCODE: Type-safe DAO slice
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Principal } from '@dfinity/principal';
import type { Token } from '@/types';

export interface DAOState {
  selectedToken: Token | null;
  tokens: Token[];
  isLoading: boolean;
  error: string | null;
}

const initialState: DAOState = {
  selectedToken: null,
  tokens: [],
  isLoading: false,
  error: null
};

const daoSlice = createSlice({
  name: 'dao',
  initialState,
  reducers: {
    setSelectedToken(state, action: PayloadAction<Token | null>) {
      state.selectedToken = action.payload;
    },
    setTokens(state, action: PayloadAction<Token[]>) {
      state.tokens = action.payload;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    }
  }
});

export const {
  setSelectedToken,
  setTokens,
  setLoading,
  setError
} = daoSlice.actions;

export default daoSlice.reducer;
```

**File:** `src/features/station/stationSlice.ts` (MODIFY: .js → .ts)

```typescript
// PSEUDOCODE: Type-safe station slice
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { OrbitStation } from '@/types';

export interface StationState {
  activeStation: OrbitStation | null;
  stations: OrbitStation[];
  isLoading: boolean;
  error: string | null;
}

const initialState: StationState = {
  activeStation: null,
  stations: [],
  isLoading: false,
  error: null
};

const stationSlice = createSlice({
  name: 'station',
  initialState,
  reducers: {
    setActiveStation(state, action: PayloadAction<OrbitStation | null>) {
      state.activeStation = action.payload;
    },
    setStations(state, action: PayloadAction<OrbitStation[]>) {
      state.stations = action.payload;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    }
  }
});

export const {
  setActiveStation,
  setStations,
  setLoading,
  setError
} = stationSlice.actions;

export default stationSlice.reducer;
```

**File:** `src/state/balance/balanceSlice.ts` (MODIFY: .js → .ts)

```typescript
// PSEUDOCODE: Type-safe balance slice
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Balance } from '@/types';
import type { Principal } from '@dfinity/principal';

export interface BalanceState {
  balances: Record<string, Balance>; // Key: token canister ID
  isLoading: boolean;
  error: string | null;
}

const initialState: BalanceState = {
  balances: {},
  isLoading: false,
  error: null
};

const balanceSlice = createSlice({
  name: 'balance',
  initialState,
  reducers: {
    setBalance(state, action: PayloadAction<Balance>) {
      const key = action.payload.token.toText();
      state.balances[key] = action.payload;
    },
    setBalances(state, action: PayloadAction<Balance[]>) {
      state.balances = {};
      action.payload.forEach(balance => {
        const key = balance.token.toText();
        state.balances[key] = balance;
      });
    },
    clearBalances(state) {
      state.balances = {};
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    }
  }
});

export const {
  setBalance,
  setBalances,
  clearBalances,
  setLoading,
  setError
} = balanceSlice.actions;

export default balanceSlice.reducer;
```

**File:** `src/state/balance/balanceThunks.ts` (MODIFY: .js → .ts)

```typescript
// PSEUDOCODE: Type-safe balance thunks
import { createAsyncThunk } from '@reduxjs/toolkit';
import type { Principal } from '@dfinity/principal';
import { balanceService } from '@/services/balanceService';

export const fetchBalance = createAsyncThunk(
  'balance/fetchBalance',
  async ({ tokenCanisterId, accountPrincipal }: {
    tokenCanisterId: Principal;
    accountPrincipal: Principal;
  }) => {
    const balance = await balanceService.getTokenBalance(
      tokenCanisterId,
      accountPrincipal
    );
    return balance;
  }
);

export const fetchAllBalances = createAsyncThunk(
  'balance/fetchAllBalances',
  async ({ accountPrincipal, tokenCanisters }: {
    accountPrincipal: Principal;
    tokenCanisters: Principal[];
  }) => {
    const balances = await balanceService.getAllBalances(
      accountPrincipal,
      tokenCanisters
    );
    return balances;
  }
);
```

### Step 9: Convert UI Components (Primitives First)

**Pattern for all UI components:**
- Add proper prop types with TypeScript interfaces
- Use React.FC or explicit function return types
- Add proper event handler types
- Ensure ref forwarding uses correct types

**File:** `src/components/ui/button.tsx` (MODIFY: .jsx → .tsx)

```typescript
// PSEUDOCODE: Type-safe button component
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center...",
  {
    variants: {
      variant: {
        default: "bg-primary...",
        destructive: "bg-destructive...",
        outline: "border...",
        // ... other variants
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-8",
        icon: "h-10 w-10"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
```

**Apply similar pattern to all UI components:**
- `src/components/ui/input.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/select.tsx`
- `src/components/ui/checkbox.tsx`
- `src/components/ui/form.tsx`
- ... (all remaining UI components)

### Step 10: Convert Feature Components

**File:** `src/components/TokenDashboard.tsx` (MODIFY: .jsx → .tsx)

```typescript
// PSEUDOCODE: Type-safe token dashboard
import React from 'react';
import type { Token, OrbitStation } from '@/types';
import { useAppSelector } from '@/state/hooks';

interface TokenDashboardProps {
  token: Token;
  station: OrbitStation | null;
}

export const TokenDashboard: React.FC<TokenDashboardProps> = ({
  token,
  station
}) => {
  const { principal } = useAppSelector(state => state.auth);

  // Component logic with proper types

  return (
    <div>
      {/* Render dashboard */}
    </div>
  );
};
```

**Apply similar pattern to all feature components:**
- Treasury components
- Proposal components
- Orbit components
- Security components
- Canister components
- etc.

### Step 11: Convert Routes

**File:** `src/routes/Homepage.tsx` (MODIFY: .jsx → .tsx)

```typescript
// PSEUDOCODE: Type-safe homepage route
import React from 'react';
import { Link } from 'react-router-dom';
import type { Token } from '@/types';

export const Homepage: React.FC = () => {
  const [tokens, setTokens] = React.useState<Token[]>([]);

  // Component logic

  return (
    <div>
      {/* Render homepage */}
    </div>
  );
};

export default Homepage;
```

**File:** `src/routes/AppRoute.tsx` (MODIFY: .jsx → .tsx)

```typescript
// PSEUDOCODE: Type-safe app route
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Token } from '@/types';

export const AppRoute: React.FC = () => {
  const { tokenId } = useParams<{ tokenId: string }>();
  const navigate = useNavigate();

  // Component logic with type-safe routing

  return (
    <div>
      {/* Render app */}
    </div>
  );
};

export default AppRoute;
```

### Step 12: Convert Providers

**File:** `src/providers/AuthProvider/IIProvider.tsx` (MODIFY: .jsx → .tsx)

```typescript
// PSEUDOCODE: Type-safe auth provider
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Identity } from '@dfinity/agent';
import type { Principal } from '@dfinity/principal';
import { authService } from '@/services/auth';

export interface IIContextValue {
  identity: Identity | null;
  principal: Principal | null;
  isAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const IIContext = createContext<IIContextValue | null>(null);

export const IIProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [principal, setPrincipal] = useState<Principal | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Provider logic with proper types

  return (
    <IIContext.Provider value={contextValue}>
      {children}
    </IIContext.Provider>
  );
};

export const useII = (): IIContextValue => {
  const context = useContext(IIContext);
  if (!context) {
    throw new Error('useII must be used within IIProvider');
  }
  return context;
};
```

### Step 13: Convert Main Application Files

**File:** `src/App.tsx` (MODIFY: .jsx → .tsx)

```typescript
// PSEUDOCODE: Type-safe App component
import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { FallbackLoader } from './components/ui/fallback-loader';
import LazyLoadErrorBoundary from './components/errors/LazyLoadErrorBoundary';

const Homepage = lazy(() => import('./routes/Homepage'));
const AppRoute = lazy(() => import('./routes/AppRoute'));

const App: React.FC = () => {
  return (
    <Router>
      <LazyLoadErrorBoundary>
        <Suspense fallback={<FallbackLoader />}>
          <Routes>
            <Route path="/" element={<Homepage />} />
            <Route path="/app" element={<AppRoute />} />
          </Routes>
        </Suspense>
      </LazyLoadErrorBoundary>
    </Router>
  );
};

export default App;
```

**File:** `src/main.tsx` (MODIFY: .jsx → .tsx)

```typescript
// PSEUDOCODE: Type-safe entry point
import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './state/store';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
);
```

### Step 14: Update Vite Config for TypeScript

**File:** `vite.config.ts` (MODIFY: .js → .ts)

```typescript
// PSEUDOCODE: Type-safe Vite configuration
/// <reference types="vitest" />
import { fileURLToPath, URL } from 'url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import environment from 'vite-plugin-environment';
import dotenv from 'dotenv';
import { visualizer } from 'rollup-plugin-visualizer';

dotenv.config({ path: '../../.env' });

export default defineConfig({
  build: {
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
        chunkFileNames: `assets/[name]-[hash]-${Date.now()}.js`,
        assetFileNames: `assets/[name]-[hash]-${Date.now()}[extname]`,
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-redux': ['@reduxjs/toolkit', 'react-redux'],
          'vendor-dfinity': ['@dfinity/agent', '@dfinity/auth-client', '@dfinity/principal'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
        },
      },
    },
    sourcemap: true,
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:4943",
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(),
    environment("all", { prefix: "CANISTER_" }),
    environment("all", { prefix: "DFX_" }),
    visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: 'src/setupTests.ts', // Updated extension
  },
  resolve: {
    alias: [
      {
        find: "declarations",
        replacement: fileURLToPath(
          new URL("./src/declarations", import.meta.url)
        ),
      },
      {
        find: "@",
        replacement: fileURLToPath(new URL("./src", import.meta.url)),
      },
    ],
    dedupe: ['@dfinity/agent'],
  },
});
```

### Step 15: Update Test Configuration

**File:** `src/setupTests.ts` (MODIFY: .js → .ts)

```typescript
// PSEUDOCODE: Type-safe test setup
import '@testing-library/jest-dom';
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Global test utilities
declare global {
  namespace Vi {
    interface Matchers<R = void> {
      // Add custom matchers if needed
    }
  }
}
```

### Step 16: Update Package.json Scripts

**File:** `package.json` (MODIFY)

```json
// PSEUDOCODE: Update scripts for TypeScript
{
  "scripts": {
    "build": "npm run type-check && npm run test:toast && vite build",
    "type-check": "tsc --noEmit",
    "format": "prettier --write \"src/**/*.{json,js,jsx,ts,tsx,css,scss}\"",
    "lint": "eslint 'src/**/*.{ts,tsx}' --max-warnings 0",
    "dev": "vite --port 3000",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:toast": "node test-toast-integration.mjs"
  },
  "devDependencies": {
    // Add TypeScript tooling
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@types/uuid": "^9.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.0.0",
    "typescript": "^5.1.3",
    // ... existing devDependencies
  }
}
```

### Step 17: Add ESLint Configuration for TypeScript

**File:** `.eslintrc.cjs` (NEW)

```javascript
// PSEUDOCODE: ESLint configuration for TypeScript + React
module.exports = {
  root: true,
  env: {
    browser: true,
    es2020: true
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended'
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs', 'node_modules'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: './tsconfig.json'
  },
  plugins: ['react', '@typescript-eslint'],
  rules: {
    'react/react-in-jsx-scope': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn'
  },
  settings: {
    react: {
      version: 'detect'
    }
  }
};
```

### Step 18: Create .prettierrc for Consistent Formatting

**File:** `.prettierrc` (NEW)

```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

## Testing Strategy

### Build Validation
```bash
# Step 1: Type check
cd daopad_frontend
npm run type-check

# Expected: No type errors

# Step 2: Run tests
npm run test

# Expected: All tests pass

# Step 3: Build for production
npm run build

# Expected: Build succeeds, no errors
```

### Runtime Validation
```bash
# Step 1: Deploy frontend to mainnet
cd ..
./deploy.sh --network ic --frontend-only

# Step 2: Verify in browser
# Visit: https://l7rlj-6aaaa-aaaaa-qaffq-cai.icp0.io
# Test:
# - Login flow works
# - Token selection works
# - Treasury data loads
# - Proposals load and display
# - All interactive features function
```

### Type Safety Validation
```bash
# Check for any remaining 'any' types
cd daopad_frontend
grep -r ": any" src/ --include="*.ts" --include="*.tsx" | wc -l

# Goal: Minimize 'any' usage (some legitimate uses in actor types)
```

## Migration Checklist

### Configuration
- [ ] Create `tsconfig.json` with strict mode
- [ ] Create `tsconfig.node.json` for build tools
- [ ] Update `vite.config.js` → `vite.config.ts`
- [ ] Add ESLint configuration for TypeScript
- [ ] Add Prettier configuration
- [ ] Update package.json scripts

### Type Definitions
- [ ] Create `src/types/global.d.ts`
- [ ] Create `src/types/index.ts` with shared types
- [ ] Create Redux store types (`src/state/store.ts`)
- [ ] Create Redux hooks (`src/state/hooks.ts`)

### Utilities & Helpers (Bottom Layer)
- [ ] Convert `src/lib/utils.js` → `.ts`
- [ ] Convert `src/utils/addressValidation.js` → `.ts`
- [ ] Convert `src/utils/serialization.js` → `.ts`
- [ ] Convert `src/utils/orbit-helpers.js` → `.ts`
- [ ] Convert `src/utils/requestDomains.js` → `.ts`

### Hooks (Service Layer)
- [ ] Convert `src/hooks/useDebounce.js` → `.ts`
- [ ] Convert `src/hooks/usePagination.js` → `.ts`
- [ ] Convert `src/hooks/useFilter.js` → `.ts`
- [ ] Convert `src/hooks/use-toast.js` → `.ts`
- [ ] Convert `src/hooks/useIdentity.jsx` → `.tsx`
- [ ] Convert `src/hooks/useLogout.jsx` → `.tsx`
- [ ] Convert `src/hooks/useActiveStation.js` → `.ts`
- [ ] Convert `src/hooks/useStationService.js` → `.ts`

### Services (API Layer)
- [ ] Convert `src/services/auth.js` → `.ts`
- [ ] Convert `src/services/balanceService.js` → `.ts`
- [ ] Convert `src/services/kongLockerService.js` → `.ts`
- [ ] Convert `src/services/addressBookService.js` → `.ts`
- [ ] Convert `src/services/orbit/stationService.js` → `.ts`
- [ ] Convert `src/services/orbit/stationClient.js` → `.ts`

### State Management (Redux)
- [ ] Convert `src/features/auth/authSlice.js` → `.ts`
- [ ] Convert `src/features/dao/daoSlice.js` → `.ts`
- [ ] Convert `src/features/station/stationSlice.js` → `.ts`
- [ ] Convert `src/state/balance/balanceSlice.js` → `.ts`
- [ ] Convert `src/state/balance/balanceThunks.js` → `.ts`

### UI Components (Primitives)
- [ ] Convert all `src/components/ui/*.jsx` → `.tsx` (~25 files)
  - [ ] alert, badge, button, calendar, card
  - [ ] checkbox, collapsible, dialog, dropdown-menu
  - [ ] EmptyState, executive-card, fallback-loader
  - [ ] form, input, label, loading-shimmer
  - [ ] popover, progress, radio-group, select
  - [ ] separator, sheet, skeleton, switch
  - [ ] table, textarea, toaster, tooltip

### Feature Components
- [ ] Convert error boundaries (5 files)
- [ ] Convert address book components (5 files)
- [ ] Convert canister components (10 files)
- [ ] Convert orbit components (40 files)
- [ ] Convert token components (10 files)
- [ ] Convert proposal components (5 files)
- [ ] Convert security components (5 files)
- [ ] Convert other feature components (20 files)

### Routes & Providers
- [ ] Convert `src/routes/Homepage.jsx` → `.tsx`
- [ ] Convert `src/routes/AppRoute.jsx` → `.tsx`
- [ ] Convert `src/providers/AuthProvider/IIProvider.jsx` → `.tsx`

### Application Core
- [ ] Convert `src/App.jsx` → `.tsx`
- [ ] Convert `src/main.jsx` → `.tsx`

### Tests
- [ ] Convert `src/setupTests.js` → `.ts`
- [ ] Convert `src/tests/App.test.jsx` → `.tsx`
- [ ] Convert `src/services/__tests__/orbitEncoding.test.js` → `.ts`

### Validation
- [ ] Run `npm run type-check` (no errors)
- [ ] Run `npm run test` (all pass)
- [ ] Run `npm run build` (successful)
- [ ] Deploy to mainnet
- [ ] Verify all features work in production
- [ ] Check browser console (no runtime errors)

## Refactoring Principles Applied

### DO (Subtractive Approach)
✅ **Fix in place** - Convert each .js/.jsx file to .ts/.tsx directly
✅ **Type safety** - Add proper TypeScript types throughout
✅ **Consolidate** - Create centralized type definitions
✅ **Delete** - Remove any unused JavaScript files after conversion
✅ **Improve** - Better intellisense, compile-time error detection

### DON'T (Avoid Additive Bloat)
❌ Don't create parallel TypeScript and JavaScript versions
❌ Don't add unnecessary abstraction layers
❌ Don't create utilities without immediate adoption
❌ Don't worry about backwards compatibility (no JS consumers)

## Benefits

### Developer Experience
- **Autocomplete**: IDE provides intelligent suggestions
- **Type safety**: Catch errors at compile time
- **Refactoring**: Safe automated refactoring
- **Documentation**: Types serve as inline documentation

### Code Quality
- **Fewer bugs**: Type errors caught before runtime
- **Better maintainability**: Explicit contracts between modules
- **Safer refactoring**: TypeScript prevents breaking changes
- **Self-documenting**: Types make code intent clear

### Long-term Value
- **Easier onboarding**: New developers understand codebase faster
- **Reduced debugging**: Fewer runtime type errors
- **Better tooling**: Full TypeScript ecosystem support
- **Future-proof**: Modern JavaScript/TypeScript best practices

## Estimated Impact

- **Files changed:** ~200 files
- **LOC change:** Minimal (mostly extension changes + type annotations)
- **Breaking changes:** None (internal refactoring only)
- **Build time:** Slightly slower (type checking)
- **Bundle size:** Same (TypeScript compiles to JavaScript)
- **Runtime performance:** Identical (same compiled output)
- **Developer productivity:** ⬆️ Significant improvement

---

## Final Notes

This is a **REFACTORING** task focused on improving code quality without changing functionality. The migration follows a bottom-up approach: utilities → services → state → components → routes → app. This ensures that when we convert a component, all its dependencies already have proper types.

The plan uses **PSEUDOCODE** throughout to guide implementation without dictating exact syntax. The implementing agent will write real TypeScript code following these patterns and using the actual codebase structure.

**Success criteria:**
1. All JavaScript files converted to TypeScript
2. Strict type checking passes
3. All tests pass
4. Production build succeeds
5. Frontend deploys and functions correctly
6. No runtime errors in browser console
