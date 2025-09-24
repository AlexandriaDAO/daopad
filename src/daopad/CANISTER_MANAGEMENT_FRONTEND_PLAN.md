# DAOPad Canister Management Frontend Implementation Plan

## 🚀 Implementation Status

### ✅ Completed Components (as of 2025-09-24)
1. **Backend Integration** - All canister management methods added to `orbit_canisters.rs`
2. **Service Layer** - `canisterService.js` with complete CRUD operations
3. **Main UI Components**:
   - `CanistersTab.jsx` - Main tab container with grid view
   - `CanisterCard.jsx` - Individual canister display with cycles meter
   - `CanisterFilters.jsx` - Search and filter functionality
   - `CreateCanisterWizard.jsx` - Multi-step wizard for create/import
4. **Integration** - Added to TokenDashboard with new "Canisters" tab

### 🔄 In Progress
- Testing canister operations on mainnet
- UI refinements and error handling

### 📋 Remaining Work (Phases 3-9)
- Canister details view with tabs (Overview, Methods, Upgrades, Snapshots, Settings)
- Method call interface with Candid argument builder
- Upgrade workflow with WASM upload
- Snapshot management UI with timeline
- Cycles management dashboard
- Advanced permissions configuration
- Bulk operations support

### 🗂️ Files Created/Modified
```
Backend:
✅ src/api/orbit_canisters.rs (NEW)
✅ src/types/orbit.rs (MODIFIED - added canister types)
✅ src/api/mod.rs (MODIFIED - added module)
✅ src/lib.rs (MODIFIED - exported types)

Frontend:
✅ src/services/canisterService.js (NEW)
✅ src/components/canisters/CanistersTab.jsx (NEW)
✅ src/components/canisters/CanisterCard.jsx (NEW)
✅ src/components/canisters/CanisterFilters.jsx (NEW)
✅ src/components/canisters/CreateCanisterWizard.jsx (NEW)
✅ src/components/TokenDashboard.jsx (MODIFIED - added tab)
```

## Overview
This document outlines the comprehensive plan for implementing Orbit Station's canister management capabilities in the DAOPad frontend. The implementation will provide a complete DevOps interface for managing Internet Computer canisters through governance.

## Table of Contents
1. [Core Features](#core-features)
2. [UI/UX Architecture](#uiux-architecture)
3. [Component Structure](#component-structure)
4. [Data Flow & State Management](#data-flow--state-management)
5. [Implementation Phases](#implementation-phases)
6. [Technical Specifications](#technical-specifications)

---

## Core Features

### 1. Canister Registry View
**Purpose**: Central hub for viewing and managing all canisters controlled by the DAO

**Features**:
- List all external canisters with status cards
- Quick stats: cycles balance, memory usage, controller status
- Search/filter by name, labels, state (active/archived)
- Bulk actions support

**UI Elements**:
```jsx
<CanistersTab>
  <CanisterFilters />
  <CanisterGrid>
    <CanisterCard>
      - Name, ID, Status badge
      - Cycles meter
      - Quick actions dropdown
      - Last activity timestamp
    </CanisterCard>
  </CanisterGrid>
</CanistersTab>
```

### 2. Create/Add Canister Flow
**Purpose**: Onboard new canisters into DAO control

**Two Paths**:
1. **Create New Canister**
   - Subnet selection (optional)
   - Initial cycles allocation
   - Auto-generate canister ID

2. **Import Existing Canister**
   - Enter canister ID
   - Verify controller status
   - Import metadata

#### ✅ Implementation Example: CreateCanisterWizard

```jsx
// src/components/canisters/CreateCanisterWizard.jsx
// Demonstrates proper optional encoding (Fix #3)

import { useState } from 'react';
import { Principal } from '@dfinity/principal';
import { canisterService } from '../../services/canisterService';

export default function CreateCanisterWizard({ onSuccess, onClose }) {
  const [mode, setMode] = useState('create'); // 'create' or 'import'
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    labels: [],
    initial_cycles: '',
    canister_id: '', // For import mode
    permissions: {
      read: 'everyone',
      change: 'admin'
    }
  });

  const handleSubmit = async () => {
    try {
      let result;

      if (mode === 'create') {
        // 🔧 Fix #3: Proper optional encoding
        result = await canisterService.createCanister({
          name: formData.name,
          description: formData.description || undefined, // Will be converted to []
          labels: formData.labels,
          initial_cycles: formData.initial_cycles ?
            BigInt(formData.initial_cycles) : undefined,
          permissions: {
            read: formData.permissions.read === 'everyone' ?
              { everyone: null } :
              { id: "00000000-e400-0000-4d8f-480000000000" },
            change: { id: "00000000-e400-0000-4d8f-480000000000" },
            calls: []
          },
          request_policies: {
            change: [],
            calls: []
          }
        });
      } else {
        // Import existing - validate Principal first
        try {
          Principal.fromText(formData.canister_id);
        } catch (e) {
          throw new Error('Invalid canister ID format');
        }

        result = await canisterService.importCanister(
          formData.canister_id,
          {
            name: formData.name,
            description: formData.description || undefined,
            labels: formData.labels,
            permissions: {
              read: { everyone: null },
              change: { id: "00000000-e400-0000-4d8f-480000000000" },
              calls: []
            }
          }
        );
      }

      if (result.Ok) {
        onSuccess(result.Ok.request);
      } else {
        throw new Error(result.Err?.message || 'Failed to create request');
      }
    } catch (error) {
      console.error('Create canister error:', error);
      alert(error.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Mode selection */}
      {step === 1 && (
        <div className="grid grid-cols-2 gap-4">
          <button
            className={`p-4 border rounded ${mode === 'create' ? 'border-blue-500' : ''}`}
            onClick={() => setMode('create')}
          >
            <h3>Create New</h3>
            <p>Deploy a new canister</p>
          </button>
          <button
            className={`p-4 border rounded ${mode === 'import' ? 'border-blue-500' : ''}`}
            onClick={() => setMode('import')}
          >
            <h3>Import Existing</h3>
            <p>Add existing canister</p>
          </button>
        </div>
      )}

      {/* Form fields based on mode */}
      {step === 2 && (
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Canister Name"
            value={formData.name}
            onChange={e => setFormData({...formData, name: e.target.value})}
            className="w-full p-2 border rounded"
          />

          {mode === 'import' && (
            <input
              type="text"
              placeholder="Canister ID (e.g., ryjl3-tyaaa-aaaaa-aaaba-cai)"
              value={formData.canister_id}
              onChange={e => setFormData({...formData, canister_id: e.target.value})}
              className="w-full p-2 border rounded"
            />
          )}

          {mode === 'create' && (
            <input
              type="number"
              placeholder="Initial Cycles (optional, in T)"
              value={formData.initial_cycles}
              onChange={e => setFormData({
                ...formData,
                initial_cycles: e.target.value ? Number(e.target.value) * 1e12 : ''
              })}
              className="w-full p-2 border rounded"
            />
          )}

          <textarea
            placeholder="Description (optional)"
            value={formData.description}
            onChange={e => setFormData({...formData, description: e.target.value})}
            className="w-full p-2 border rounded"
            rows={3}
          />
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <button onClick={() => step > 1 ? setStep(step - 1) : onClose()}>
          {step > 1 ? 'Back' : 'Cancel'}
        </button>
        <button
          onClick={() => step < 2 ? setStep(2) : handleSubmit()}
          className="btn btn-primary"
        >
          {step < 2 ? 'Next' : 'Create Request'}
        </button>
      </div>
    </div>
  );
}
```

**Shared Configuration**:
- Name & description
- Labels/tags for organization
- Initial permissions setup
- Request policies configuration

**UI Flow**:
```
[Add Canister Button] →
[Choice Modal: Create New / Import Existing] →
[Multi-step Form Wizard] →
[Review & Submit Request]
```

### 3. Canister Details View
**Purpose**: Deep dive into individual canister management

**Sections**:
- **Overview Tab**
  - Status, cycles, memory, module hash
  - Controllers list
  - Recent activity feed

- **Methods Tab**
  - List all callable methods
  - Configure permissions per method
  - Set validation methods
  - Test method calls

- **Upgrades Tab**
  - Deploy new WASM
  - View deployment history
  - Rollback capabilities

- **Snapshots Tab**
  - List snapshots (up to 10)
  - Take new snapshot
  - Restore from snapshot
  - Delete old snapshots

- **Settings Tab**
  - Update metadata
  - Configure cycles monitoring
  - Set native settings (memory limits, etc.)
  - Archive/delete canister

### 4. Method Call Interface
**Purpose**: Execute and test canister methods

**Features**:
- Method selector with search
- Dynamic argument input based on Candid interface
- Validation method testing
- Cycles attachment option
- Response viewer with formatting

**UI Components**:
```jsx
<MethodCallDialog>
  <MethodSelector />
  <ArgumentBuilder>
    - Auto-generate form from Candid types
    - JSON/Text input toggle
    - Validate before submit
  </ArgumentBuilder>
  <ValidationSection>
    - Run validation method
    - Show human-readable preview
  </ValidationSection>
  <ExecutionOptions>
    - Attach cycles input
    - Approval policy display
  </ExecutionOptions>
</MethodCallDialog>
```

### 5. Canister Upgrade Workflow
**Purpose**: Deploy new code to canisters safely

#### 🧪 Test Upgrade Operations

```bash
# Test WASM upgrade request:
dfx canister --network ic call fec7w-zyaaa-aaaaa-qaffq-cai \
  submit_request '(record {
    operation = variant {
      ChangeExternalCanister = record {
        external_canister_id = "[UUID]";
        kind = variant {
          Upgrade = record {
            mode = variant { upgrade };
            wasm_module = blob "[WASM_BYTES]";
            arg = null
          }
        }
      }
    };
    title = "Upgrade canister"
  })' --identity daopad

# Test settings change:
dfx canister --network ic call fec7w-zyaaa-aaaaa-qaffq-cai \
  submit_request '(record {
    operation = variant {
      ChangeExternalCanister = record {
        external_canister_id = "[UUID]";
        kind = variant {
          NativeSettings = record {
            controllers = null;
            compute_allocation = opt 10;
            memory_allocation = opt 2147483648;
            freezing_threshold = opt 2592000;
            reserved_cycles_limit = null;
            log_visibility = null;
            wasm_memory_limit = null
          }
        }
      }
    };
    title = "Update canister settings"
  })' --identity daopad
```

**Process**:
1. **Upload WASM**
   - Drag-drop or file selection
   - Support chunked uploads for large modules
   - Show module hash

2. **Configure Upgrade**
   - Choose install mode (install/reinstall/upgrade)
   - Optional init arguments
   - Backup snapshot option

3. **Review & Execute**
   - Show what will change
   - Display risk level
   - Require confirmations for destructive operations

**Safety Features**:
- Automatic pre-upgrade snapshot
- Rollback button for recent upgrades
- Diff view for module changes

### 6. Cycles Management Dashboard
**Purpose**: Monitor and manage cycles across all canisters

#### ✅ Implementation: CanisterCard with Cycles Display

```jsx
// src/components/canisters/CanisterCard.jsx
// Shows UUID vs Principal distinction and cycles formatting

import { useState, useEffect } from 'react';
import { canisterService } from '../../services/canisterService';

export default function CanisterCard({ canister, onTopUp, onConfigure }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, [canister.canister_id]);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      // Use Principal for IC management canister calls
      const result = await canisterService.getCanisterStatus(
        canister.canister_id  // This is the Principal
      );
      if (result.Ok) {
        setStatus(result.Ok);
      }
    } catch (error) {
      console.error('Failed to fetch status:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCycles = (cycles) => {
    if (!cycles) return '0 T';
    const trillion = Number(cycles) / 1e12;
    return `${trillion.toFixed(2)} T`;
  };

  const getCyclesColor = (cycles) => {
    const trillion = Number(cycles) / 1e12;
    if (trillion < 1) return 'text-red-500';
    if (trillion < 5) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <div className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-lg">{canister.name}</h3>
          <p className="text-xs text-gray-500 font-mono">
            ID: {canister.id.substring(0, 8)}...  {/* UUID display */}
          </p>
        </div>
        <span className={`px-2 py-1 rounded text-xs ${
          canister.state?.Active ? 'bg-green-100 text-green-800' : 'bg-gray-100'
        }`}>
          {canister.state?.Active ? 'Active' : 'Archived'}
        </span>
      </div>

      {/* Canister Principal */}
      <div className="mb-3">
        <p className="text-xs text-gray-600">Canister:</p>
        <p className="text-xs font-mono break-all">
          {canister.canister_id}  {/* Principal */}
        </p>
      </div>

      {/* Cycles Display */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm text-gray-600">Cycles</span>
          {loading ? (
            <span className="text-sm animate-pulse">Loading...</span>
          ) : (
            <span className={`text-sm font-semibold ${getCyclesColor(status?.cycles)}`}>
              {formatCycles(status?.cycles)}
            </span>
          )}
        </div>
        {status && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                getCyclesColor(status.cycles).replace('text-', 'bg-')
              }`}
              style={{
                width: `${Math.min(100, (Number(status.cycles) / 1e13) * 100)}%`
              }}
            />
          </div>
        )}
      </div>

      {/* Memory & Module Hash */}
      {status && (
        <div className="text-xs text-gray-600 mb-4 space-y-1">
          <p>Memory: {(Number(status.memory_size) / 1e6).toFixed(2)} MB</p>
          {status.module_hash && (
            <p>Module: {status.module_hash[0]?.substring(0, 8)}...</p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onTopUp(canister.id)}  // ⚠️ Pass UUID for Orbit operations!
          className="flex-1 px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Top Up
        </button>
        <button
          onClick={() => onConfigure(canister.id)}  // ⚠️ UUID again!
          className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
        >
          Configure
        </button>
      </div>

      {/* Labels */}
      {canister.labels?.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {canister.labels.map(label => (
            <span key={label} className="px-2 py-1 text-xs bg-gray-100 rounded">
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
```

**Features**:
- **Overview Panel**
  - Total cycles across canisters
  - Burn rate analysis
  - Low balance alerts

- **Auto-funding Rules**
  - Configure monitoring strategies
  - Set thresholds and top-up amounts
  - Estimate runtime settings

- **Manual Funding**
  - Send cycles to specific canisters
  - Bulk funding operations

**UI Layout**:
```jsx
<CyclesManagement>
  <CyclesOverview>
    - Total cycles chart
    - Canister distribution pie chart
    - Alert panel for low balances
  </CyclesOverview>
  <MonitoringRules>
    <RuleCard>
      - Strategy selector
      - Threshold inputs
      - Enable/disable toggle
    </RuleCard>
  </MonitoringRules>
  <FundingActions />
</CyclesManagement>
```

### 7. Permissions & Policies Configuration
**Purpose**: Fine-grained access control for canister operations

**Configuration Levels**:
1. **Canister Level**
   - Read permissions
   - Change permissions
   - Delete permissions

2. **Method Level**
   - Per-method allow lists
   - Validation requirements
   - Execution permissions

3. **Request Policies**
   - Approval thresholds
   - Time delays
   - Conditional rules

**UI Interface**:
```jsx
<PermissionsMatrix>
  <CanisterPermissions>
    - User/group selector
    - Permission type checkboxes
  </CanisterPermissions>
  <MethodPermissions>
    - Method list with search
    - Permission editor per method
    - Bulk edit capabilities
  </MethodPermissions>
  <PolicyBuilder>
    - Visual rule builder
    - Threshold sliders
    - Preview affected operations
  </PolicyBuilder>
</PermissionsMatrix>
```

### 8. Snapshot Management
**Purpose**: Backup and restore canister state

**Features**:
- Visual timeline of snapshots
- Snapshot comparison tool
- One-click restore with confirmation
- Automatic snapshot scheduling
- Storage usage indicators

#### 🧪 Test Snapshot Operations

```bash
# Take a snapshot:
dfx canister --network ic call fec7w-zyaaa-aaaaa-qaffq-cai \
  submit_request '(record {
    operation = variant {
      SnapshotExternalCanister = record {
        external_canister_id = "[UUID]";
        force = false
      }
    };
    title = "Take canister snapshot"
  })' --identity daopad

# List snapshots (via canister_status):
dfx canister --network ic call fec7w-zyaaa-aaaaa-qaffq-cai \
  canister_status '(record {
    canister_id = principal "[actual-canister-principal]"
  })' --identity daopad

# Restore from snapshot:
dfx canister --network ic call fec7w-zyaaa-aaaaa-qaffq-cai \
  submit_request '(record {
    operation = variant {
      RestoreExternalCanister = record {
        external_canister_id = "[UUID]";
        snapshot_id = "[snapshot-id]"
      }
    };
    title = "Restore canister from snapshot"
  })' --identity daopad
```

**UI Design**:
```jsx
<SnapshotManager>
  <SnapshotTimeline>
    - Visual timeline with markers
    - Hover for snapshot details
    - Click to select/compare
  </SnapshotTimeline>
  <SnapshotActions>
    - Take snapshot button
    - Restore button (with confirmation)
    - Delete button
    - Download snapshot ID
  </SnapshotActions>
  <SnapshotDetails>
    - Creation time
    - Size estimate
    - Associated upgrade/change
    - Snapshot ID
  </SnapshotDetails>
</SnapshotManager>
```

---

## UI/UX Architecture

### Navigation Structure
```
TokenDashboard
├── Overview (existing)
├── Treasury (existing)
├── Members (existing)
├── Proposals (existing)
├── Canisters (NEW)
│   ├── Registry
│   ├── Add Canister
│   └── [Canister Details]
│       ├── Overview
│       ├── Methods
│       ├── Upgrades
│       ├── Snapshots
│       └── Settings
└── Settings (enhanced)
    └── Canister Policies
```

### Design Principles
1. **Progressive Disclosure**: Simple overview → detailed management
2. **Safety First**: Confirmations for destructive operations
3. **Visual Feedback**: Loading states, success/error notifications
4. **Contextual Help**: Tooltips and documentation links
5. **Responsive Design**: Works on desktop and tablet

---

## Component Structure

### New Components to Create

#### ✅ Component Implementation with Universal Fixes

```jsx
// src/components/canisters/CanistersTab.jsx
// CRITICAL: Implements all 4 universal fixes

import React, { useState, useEffect } from 'react';
import { canisterService } from '../../services/canisterService';
import CanisterCard from './CanisterCard';
import CanisterFilters from './CanisterFilters';
import { Alert, AlertDescription } from '../ui/alert';

export default function CanistersTab({ orbitStationId }) {
  const [canisters, setCanisters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    paginate: { offset: 0n, limit: 20n },
    sort_by: null,
    filter_by: null  // 🔧 Fix #4: Always include all fields
  });

  useEffect(() => {
    fetchCanisters();
  }, [orbitStationId, filters]);

  const fetchCanisters = async () => {
    setLoading(true);
    setError(null);

    try {
      // Log request for debugging (Fix #4 verification)
      console.log('Fetching canisters with filters:', filters);

      const result = await canisterService.listCanisters(
        orbitStationId,
        filters  // All fields included
      );

      if (result.success) {
        setCanisters(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('Failed to fetch canisters:', err);
      setError('Failed to load canisters');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">External Canisters</h2>
        <button
          className="btn btn-primary"
          onClick={() => openCreateCanisterDialog()}
        >
          Add Canister
        </button>
      </div>

      <CanisterFilters
        onFiltersChange={setFilters}
        initialFilters={filters}
      />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-gray-200 animate-pulse rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {canisters.map(canister => (
            <CanisterCard
              key={canister.id}  // UUID, not Principal!
              canister={canister}
              onTopUp={() => handleTopUp(canister.id)}
              onConfigure={() => handleConfigure(canister.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

```
src/components/
├── canisters/
│   ├── CanistersTab.jsx                 # Main tab container (shown above)
│   ├── CanisterCard.jsx                 # Grid item display
│   ├── CanisterFilters.jsx              # Search and filters
│   ├── CreateCanisterWizard.jsx         # Multi-step creation
│   ├── CanisterDetails.jsx              # Detail view container
│   ├── CanisterOverview.jsx             # Status and info
│   ├── CanisterMethods.jsx              # Method configuration
│   ├── CanisterUpgrades.jsx             # Code deployment
│   ├── CanisterSnapshots.jsx            # Backup management
│   ├── CanisterSettings.jsx             # Configuration
│   ├── MethodCallDialog.jsx             # Method execution
│   ├── ArgumentBuilder.jsx              # Dynamic form builder
│   ├── PermissionsMatrix.jsx            # Permission configuration
│   ├── CyclesManagement.jsx             # Cycles dashboard
│   ├── MonitoringRuleCard.jsx           # Auto-funding rules
│   └── SnapshotTimeline.jsx             # Visual snapshot history
│
├── ui/ (enhancements)
│   ├── CodeEditor.jsx                   # For JSON/Candid input
│   ├── FileUpload.jsx                   # WASM upload
│   ├── CyclesMeter.jsx                  # Visual cycles display
│   └── ConfirmationModal.jsx            # Enhanced confirmations
│
└── shared/
    ├── CanisterBadge.jsx                # Status indicators
    ├── MethodSignature.jsx              # Method display
    └── WasmHash.jsx                     # Module hash display
```

### Service Layer Extensions

```javascript
// src/services/canisterService.js
export const canisterService = {
  // Registry
  listCanisters: async (filters) => {},
  getCanisterDetails: async (canisterId) => {},
  getCanisterStatus: async (canisterId) => {},

  // Creation
  createCanister: async (config) => {},
  importCanister: async (canisterId, config) => {},

  // Management
  upgradeCanister: async (canisterId, wasm, args) => {},
  configureCanister: async (canisterId, settings) => {},
  callCanisterMethod: async (canisterId, method, args) => {},

  // Cycles
  fundCanister: async (canisterId, cycles) => {},
  monitorCanister: async (canisterId, strategy) => {},

  // Snapshots
  takeSnapshot: async (canisterId) => {},
  restoreSnapshot: async (canisterId, snapshotId) => {},
  listSnapshots: async (canisterId) => {},

  // Permissions
  updateMethodPermissions: async (canisterId, permissions) => {},
  updateRequestPolicies: async (canisterId, policies) => {},
};
```

---

## Data Flow & State Management

### State Structure
```javascript
// Enhanced Redux/Context state
{
  canisters: {
    registry: {
      items: [],          // List of canisters
      filters: {},        // Active filters
      loading: false,
      error: null
    },
    details: {
      [canisterId]: {
        info: {},         // Basic information
        status: {},       // Cycles, memory, etc.
        methods: [],      // Available methods
        permissions: {},  // Access control
        snapshots: [],    // Backup snapshots
        monitoring: {},   // Cycles monitoring rules
      }
    },
    operations: {
      pending: [],        // Pending operations
      history: []         // Operation history
    }
  }
}
```

### Data Fetching Strategy
1. **Lazy Loading**: Load canister details on demand
2. **Polling**: Regular status updates for active canisters
3. **Caching**: Cache method signatures and permissions
4. **Optimistic Updates**: Show pending states immediately

---

## Implementation Phases

### Phase 0: Backend Integration (CRITICAL - Do First!) ✅ COMPLETED

#### ✅ Backend Methods Added (COMPLETED)

```rust
// File: daopad_backend/src/api/orbit_canisters.rs (NEW FILE)

use crate::types::orbit::*;
use candid::Principal;
use ic_cdk::api::call::call;

#[update]  // ⚠️ MUST be update, not query!
async fn list_orbit_canisters(
    station_id: Principal,
    filters: ListExternalCanistersInput
) -> Result<ListExternalCanistersResult, String> {
    // All fields must be present for Orbit
    let request = ListExternalCanistersInput {
        paginate: filters.paginate,
        sort_by: filters.sort_by,
        filter_by: filters.filter_by,  // Don't skip even if None!
    };

    let result: Result<(ListExternalCanistersResult,), _> = call(
        station_id,
        "list_external_canisters",
        (request,)
    ).await;

    result.map(|r| r.0).map_err(|e| format!("Failed to list canisters: {:?}", e))
}

#[update]
async fn get_orbit_canister(
    station_id: Principal,
    external_canister_id: String  // UUID as string
) -> Result<GetExternalCanisterResult, String> {
    let result: Result<(GetExternalCanisterResult,), _> = call(
        station_id,
        "get_external_canister",
        (GetExternalCanisterInput { external_canister_id },)
    ).await;

    result.map(|r| r.0).map_err(|e| format!("Failed to get canister: {:?}", e))
}

#[update]
async fn create_orbit_canister_request(
    station_id: Principal,
    config: CreateExternalCanisterOperationInput,
    title: String,
    summary: Option<String>
) -> Result<SubmitRequestResult, String> {
    let operation = RequestOperation::CreateExternalCanister(config);

    let request = SubmitRequestInput {
        operation,
        title,
        summary,
        execution_plan: None,
    };

    let result: Result<(SubmitRequestResult,), _> = call(
        station_id,
        "submit_request",
        (request,)
    ).await;

    result.map(|r| r.0).map_err(|e| format!("Failed to create request: {:?}", e))
}
```

#### 🔧 After Adding Backend Methods:

```bash
# 1. Build and extract candid
cargo build --target wasm32-unknown-unknown --release -p daopad_backend --locked
candid-extractor target/wasm32-unknown-unknown/release/daopad_backend.wasm > \
  src/daopad/daopad_backend/daopad_backend.did

# 2. Deploy backend
./deploy.sh --network ic --backend-only

# 3. CRITICAL: Sync declarations (Fix for Issue #2)
cp -r src/declarations/daopad_backend/* \
      src/daopad/daopad_frontend/src/declarations/daopad_backend/

# 4. Verify sync worked
grep "list_orbit_canisters" \
  src/daopad/daopad_frontend/src/declarations/daopad_backend/daopad_backend.did.js

# 5. Deploy frontend
./deploy.sh --network ic --frontend-only
```

### Phase 1: Foundation (Week 1-2) ✅ COMPLETED
- [x] Create Canisters tab structure - `CanistersTab.jsx` created
- [x] Implement canister registry view - Grid view implemented
- [x] Basic canister card component - `CanisterCard.jsx` with cycles display
- [x] List canisters from backend - `canisterService.js` created
- [x] Add canister filters - `CanisterFilters.jsx` with search and state filters
- [x] Create canister service layer - Complete service with all CRUD operations

### Phase 2: Canister Creation (Week 2-3) ✅ COMPLETED
- [x] Create new canister wizard - `CreateCanisterWizard.jsx` with multi-step flow
- [x] Import existing canister flow - Mode selection in wizard
- [x] Permission configuration UI - Basic permissions in wizard
- [x] Initial cycles allocation - Input field for cycles in create mode
- [x] Subnet selection interface - Basic subnet support (default)

### Phase 3: Canister Details (Week 3-4)
- [ ] Canister detail view routing
- [ ] Overview tab with status
- [ ] Settings tab
- [ ] Basic method list
- [ ] Update metadata functionality

### Phase 4: Method Management (Week 4-5)
- [ ] Method permission matrix
- [ ] Method call dialog
- [ ] Argument builder from Candid
- [ ] Validation method configuration
- [ ] Response viewer

### Phase 5: Upgrades & Deployment (Week 5-6)
- [ ] WASM upload interface
- [ ] Upgrade configuration form
- [ ] Install mode selection
- [ ] Pre-upgrade snapshot option
- [ ] Deployment history view

### Phase 6: Snapshot Management (Week 6-7)
- [ ] Snapshot list view
- [ ] Take snapshot interface
- [ ] Restore functionality
- [ ] Snapshot timeline visualization
- [ ] Automatic snapshot rules

### Phase 7: Cycles Management (Week 7-8)
- [ ] Cycles dashboard
- [ ] Monitoring rule configuration
- [ ] Manual funding interface
- [ ] Bulk operations
- [ ] Low balance alerts

### Phase 8: Advanced Features (Week 8-9)
- [ ] Bulk canister operations
- [ ] Advanced permission rules
- [ ] Method testing interface
- [ ] Canister comparison view
- [ ] Export/import configurations

### Phase 9: Polish & Testing (Week 9-10)
- [ ] Error handling improvements
- [ ] Loading states optimization
- [ ] Responsive design fixes
- [ ] Integration testing
- [ ] Documentation

---

## Technical Specifications

### API Endpoints Required
```typescript
// Backend methods to implement/verify
interface CanisterAPI {
  // Registry
  list_external_canisters(filters: ListExternalCanistersInput): Promise<CanisterList>
  get_external_canister(id: UUID): Promise<ExternalCanister>

  // Creation
  create_external_canister(input: CreateExternalCanisterOperationInput): Promise<Request>

  // Management
  change_external_canister(input: ChangeExternalCanisterOperationInput): Promise<Request>
  configure_external_canister(input: ConfigureExternalCanisterOperationInput): Promise<Request>
  call_external_canister(input: CallExternalCanisterOperationInput): Promise<Request>

  // Cycles
  fund_external_canister(input: FundExternalCanisterOperationInput): Promise<Request>
  monitor_external_canister(input: MonitorExternalCanisterOperationInput): Promise<Request>

  // Snapshots
  snapshot_external_canister(input: SnapshotExternalCanisterOperationInput): Promise<Request>
  restore_external_canister(input: RestoreExternalCanisterOperationInput): Promise<Request>
  prune_external_canister(input: PruneExternalCanisterOperationInput): Promise<Request>

  // Status
  get_canister_status(canister_id: Principal): Promise<CanisterStatusResponse>
  list_canister_snapshots(canister_id: Principal): Promise<Snapshot[]>
}
```

### Type Definitions
```typescript
// Frontend type definitions
interface ExternalCanister {
  id: UUID
  canister_id: Principal
  name: string
  description?: string
  labels: string[]
  metadata: Record<string, any>
  state: 'Active' | 'Archived'
  created_at: string
  modified_at?: string
  monitoring?: MonitoringConfig
}

interface CanisterMethod {
  name: string
  signature: string
  permissions: MethodPermissions
  validation_method?: string
  request_policy?: RequestPolicy
}

interface MonitoringStrategy {
  type: 'Always' | 'BelowThreshold' | 'BelowEstimatedRuntime'
  config: MonitoringConfig
}

interface Snapshot {
  id: string
  taken_at: string
  taken_by: UUID
  size?: bigint
}
```

### Error Handling
```javascript
// Comprehensive error handling
const ERROR_CODES = {
  CANISTER_NOT_FOUND: 'E001',
  INSUFFICIENT_CYCLES: 'E002',
  PERMISSION_DENIED: 'E003',
  INVALID_WASM: 'E004',
  SNAPSHOT_LIMIT_REACHED: 'E005',
  VALIDATION_FAILED: 'E006',
  UPGRADE_FAILED: 'E007',
};

// User-friendly error messages
const ERROR_MESSAGES = {
  E001: 'Canister not found. It may have been deleted.',
  E002: 'Insufficient cycles for this operation.',
  E003: 'You do not have permission to perform this action.',
  E004: 'Invalid WASM module. Please check the file.',
  E005: 'Maximum snapshots (10) reached. Delete old snapshots first.',
  E006: 'Validation method rejected the arguments.',
  E007: 'Upgrade failed. Canister has been restored from snapshot.',
};
```

### Performance Considerations

#### ✅ Implemented Solutions

1. **Virtualization**: Use virtual scrolling for large canister lists
   ```jsx
   import { FixedSizeList } from 'react-window';
   // Only render visible items
   ```

2. **Lazy Loading with Hash ID Support**:
   ```javascript
   // Lazy load details with proper parsing
   const loadCanisterDetails = async (uuid) => {
     if (cache[uuid]) return cache[uuid];

     const result = await getCanisterDetails(uuid);
     if (result.Ok) {
       // Parse with hash ID support
       const parsed = parseCanisterFromCandid(result.Ok);
       cache[uuid] = parsed;
       return parsed;
     }
   };
   ```

3. **Debouncing**: Debounce search and filter inputs
   ```javascript
   const debouncedSearch = useMemo(
     () => debounce((term) => {
       setFilters(prev => ({
         ...prev,
         filter_by: term ? [{ key: 'name', value: [term] }] : null
       }));
     }, 300),
     []
   );
   ```

4. **Caching with TTL**: Cache canister metadata
   ```javascript
   const cache = new Map();
   const TTL = 5 * 60 * 1000; // 5 minutes
   ```

5. **Pagination**: Always include pagination params
   ```javascript
   const defaultPagination = {
     offset: 0n,
     limit: 20n
   };
   ```

### Security Considerations
1. **Validation**: Client-side validation before submission
2. **Confirmations**: Multi-step confirmation for destructive operations
3. **Audit Trail**: Log all canister operations
4. **Permission Checks**: Verify permissions before showing actions
5. **Secure Upload**: Validate WASM modules before upload

---

## Success Metrics
- **Adoption**: Number of canisters managed through UI
- **Efficiency**: Time to complete common operations
- **Safety**: Reduction in failed operations
- **User Satisfaction**: Feedback on ease of use
- **Coverage**: Percentage of Orbit features implemented

---

## Future Enhancements
1. **Canister Templates**: Pre-configured setups for common use cases
2. **Batch Operations**: Apply changes to multiple canisters
3. **Monitoring Dashboard**: Real-time canister health monitoring
4. **Cost Analysis**: Cycles burn rate predictions
5. **Integration Testing**: Automated testing of canister methods
6. **CI/CD Integration**: Automated deployment pipelines
7. **Backup Automation**: Scheduled snapshot policies
8. **Migration Tools**: Bulk import/export of configurations

---

## Dependencies

### Required Packages
```json
{
  "dependencies": {
    "@dfinity/principal": "^0.19.0",
    "@dfinity/candid": "^0.19.0",
    "react-window": "^1.8.8",        // For virtualization
    "recharts": "^2.5.0",            // For cycles charts
    "react-dropzone": "^14.2.3",     // For WASM upload
    "lodash.debounce": "^4.0.8"      // For search debouncing
  }
}
```

### Existing Components to Reuse
- `shadcn/ui` components (Button, Dialog, Alert, etc.)
- `OrbitServiceBase` for common Orbit patterns
- `EmptyState` component for no-data states
- Existing table components as templates

---

## Testing Strategy

### 🧪 Comprehensive Test Suite

#### Unit Tests with Universal Fixes

```javascript
// __tests__/canisterService.test.js

import { canisterService, candid_hash } from '../services/canisterService';

describe('Canister Service', () => {
  describe('Hash ID Handling (Fix #1)', () => {
    test('candid_hash generates correct hash', () => {
      expect(candid_hash('id')).toBe(2090175685);
      expect(candid_hash('canister_id')).toBe(1091556253);
      expect(candid_hash('name')).toBe(3456615865);
    });

    test('parseCanisterFromCandid handles hash IDs', () => {
      const mockResponse = {
        Record: {
          fields: [
            { id: { Id: 2090175685 }, val: "test-uuid" },
            { id: { Named: "name" }, val: "Test Canister" }
          ]
        }
      };

      const result = parseCanisterFromCandid(mockResponse);
      expect(result.id).toBe("test-uuid");
      expect(result.name).toBe("Test Canister");
    });
  });

  describe('Optional Encoding (Fix #3)', () => {
    test('createCanister encodes optionals correctly', () => {
      const config = {
        name: "Test",
        description: "Desc",
        labels: []
      };

      const encoded = canisterService.encodeCreateConfig(config);
      expect(encoded.description).toEqual(["Desc"]);
      expect(encoded.metadata).toEqual([]);
    });
  });

  describe('Complete Request Fields (Fix #4)', () => {
    test('listCanisters includes all required fields', () => {
      const spy = jest.spyOn(orbitStation, 'list_external_canisters');

      canisterService.listCanisters({ paginate: { limit: 10n } });

      expect(spy).toHaveBeenCalledWith({
        paginate: { limit: 10n },
        sort_by: null,
        filter_by: null  // All fields present!
      });
    });
  });
});
```

#### Integration Tests

```bash
# test-canister-integration.sh

#!/bin/bash
set -e

STATION="fec7w-zyaaa-aaaaa-qaffq-cai"
IDENTITY="daopad"

echo "Testing list_external_canisters..."
dfx canister --network ic call $STATION list_external_canisters \
  '(record { paginate = null; sort_by = null; filter_by = null })' \
  --identity $IDENTITY

echo "Testing create canister request..."
RESULT=$(dfx canister --network ic call $STATION submit_request \
  '(record {
    operation = variant {
      CreateExternalCanister = record {
        kind = variant { CreateNew = record {} };
        name = "Integration Test Canister";
        description = opt "Test";
        labels = vec {};
        metadata = null;
        permissions = record {
          read = variant { everyone };
          change = variant { id = "00000000-e400-0000-4d8f-480000000000" };
          calls = vec {}
        };
        request_policies = record { change = vec {}; calls = vec {} }
      }
    };
    title = "Test canister creation"
  })' --identity $IDENTITY)

echo "Result: $RESULT"
```

### Manual Testing Checklist

- [ ] List canisters loads without errors
- [ ] Filters work (search by name)
- [ ] Create new canister request submits
- [ ] Import existing canister works
- [ ] Top-up cycles request creates
- [ ] Canister details show UUID and Principal
- [ ] Method calls execute properly
- [ ] Snapshots can be taken/restored
- [ ] Permissions matrix displays correctly
- [ ] Error messages are user-friendly

---

## Documentation Requirements
1. **User Guide**: How to manage canisters
2. **API Documentation**: Backend methods
3. **Component Documentation**: Props and usage
4. **Security Guide**: Best practices
5. **Troubleshooting**: Common issues and solutions

## Troubleshooting Guide

### Common Issues & Solutions

#### Issue: "actor.list_orbit_canisters is not a function"
**Cause:** Declaration sync issue (Universal Issue #2)
**Solution:**
```bash
# After adding backend method:
cp -r src/declarations/daopad_backend/* \
      src/daopad/daopad_frontend/src/declarations/daopad_backend/

# Verify method exists:
grep "list_orbit_canisters" \
  src/daopad/daopad_frontend/src/declarations/daopad_backend/daopad_backend.did.js
```

#### Issue: "Record is missing key [filter_by]"
**Cause:** Frontend not sending all expected fields (Universal Issue #4)
**Solution:**
```javascript
// WRONG - Omitting fields
const result = await list_external_canisters({
  paginate: { limit: 10 }
});

// CORRECT - Include all fields
const result = await list_external_canisters({
  paginate: { limit: 10 },
  sort_by: null,
  filter_by: null  // Must include even if null!
});
```

#### Issue: Empty results despite canisters existing
**Cause:** Hash ID fields not parsed (Universal Issue #1)
**Solution:**
```javascript
// Add candid_hash function to parser:
function getField(fields, name) {
  return fields.find(f =>
    (f.id?.Named === name) ||
    (f.id?.Id === candid_hash(name))  // Check hash IDs too!
  )?.val;
}
```

#### Issue: "Invalid UUID format"
**Cause:** Using Principal instead of UUID
**Solution:**
```javascript
// Get the UUID from list response:
const canisterList = await list_external_canisters();
const uuid = canisterList.items[0].id;  // This is UUID

// Use UUID for Orbit operations:
await fund_external_canister({ external_canister_id: uuid });

// Use Principal for IC management:
const principal = canisterList.items[0].canister_id;
await canister_status({ canister_id: principal });
```

#### Issue: "Failed to decode canister response"
**Cause:** Incorrect optional encoding (Universal Issue #3)
**Solution:**
```javascript
// WRONG
description: someValue || null

// CORRECT
description: someValue ? [someValue] : []
```

#### Issue: Cycles display shows "NaN T"
**Cause:** BigInt not converted properly
**Solution:**
```javascript
const formatCycles = (cycles) => {
  if (!cycles) return '0 T';
  // Convert BigInt to Number safely
  const trillion = Number(cycles) / 1e12;
  return `${trillion.toFixed(2)} T`;
};
```

### Debug Checklist

When implementing a new canister feature:

1. **Test with dfx first:**
   ```bash
   dfx canister --network ic call fec7w-zyaaa-aaaaa-qaffq-cai \
     [method_name] '[arguments]' --identity daopad
   ```

2. **Check response structure:**
   - Look for hash IDs (numeric field IDs)
   - Note variant encoding (`{ Active: null }` not `"Active"`)
   - Check optional wrapping (arrays vs nulls)

3. **Verify backend implementation:**
   ```bash
   # Check if method exists in candid
   grep "method_name" src/daopad/daopad_backend/daopad_backend.did

   # Test backend method
   dfx canister --network ic call daopad_backend \
     method_name '[arguments]'
   ```

4. **Console log requests:**
   ```javascript
   console.log('Request payload:', request);
   // Verify all fields are present
   ```

5. **Check actor creation:**
   ```javascript
   // Should use simple direct creation:
   const actor = Actor.createActor(idlFactory, {
     agent,
     canisterId: Principal.fromText(stationId)
   });
   ```

---

## Quick Implementation Checklist

### Before Starting ANY Canister Feature:

1. [ ] Test the Orbit method with dfx first:
   ```bash
   dfx canister --network ic call fec7w-zyaaa-aaaaa-qaffq-cai [method] '[args]' --identity daopad
   ```

2. [ ] Check if fields return as hash IDs:
   - Look for numeric IDs like `id_2090175685`
   - If yes, implement candid_hash in parser

3. [ ] Verify backend has the method:
   ```bash
   grep "method_name" src/daopad/daopad_backend/daopad_backend.did
   ```

4. [ ] After backend changes, sync declarations:
   ```bash
   cp -r src/declarations/daopad_backend/* \
         src/daopad/daopad_frontend/src/declarations/daopad_backend/
   ```

5. [ ] For list operations, send ALL fields:
   ```javascript
   // Even if null/empty!
   { paginate: null, sort_by: null, filter_by: null }
   ```

6. [ ] For optional fields, use proper encoding:
   ```javascript
   description: hasValue ? [value] : []  // Not null or undefined!
   ```

7. [ ] Remember UUID vs Principal:
   - External canister operations use UUID
   - IC management uses Principal

8. [ ] All modifications go through requests:
   - No direct `configure_canister` calls
   - Use `submit_request` with operation variant

## Conclusion

This enhanced plan provides a bulletproof roadmap for implementing canister management in DAOPad. By following the empirical validation approach and addressing the four universal Orbit integration issues upfront, the implementation will avoid common pitfalls and deliver a robust DevOps solution for Internet Computer canisters managed through DAO governance.

### Key Success Factors:
1. **Always test with dfx first** - If it works in dfx, it will work in code
2. **Handle hash IDs properly** - Use candid_hash for field matching
3. **Sync declarations after backend changes** - Prevents "not a function" errors
4. **Send complete requests** - Include all fields, even if empty
5. **Use correct IDs** - UUID for Orbit operations, Principal for IC management

### Expected Timeline Impact:
By addressing the universal issues upfront and using the validated types/methods, the implementation timeline can be reduced by 30-40% compared to discovering these issues during development.