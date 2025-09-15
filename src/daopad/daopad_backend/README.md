# DAOPad Backend with Orbit Station Support

This DAOPad backend has been enhanced to create and manage Orbit wallets/stations directly from canisters.

## New Orbit Station Features

### Create Orbit Station
- **Method**: `create_orbit_station(CreateOrbitStationRequest) -> Result<OrbitStationResponse, String>`
- **Description**: Creates a new Orbit wallet/station where the DAOPad backend canister is the admin
- **Authentication**: Requires authenticated caller (not anonymous)

**Example Usage**:
```bash
dfx canister call daopad_backend create_orbit_station '(record { name = "My DAO Wallet" })'
```

### Query Your Station
- **Method**: `get_my_orbit_station() -> Option<OrbitStationInfo>`
- **Description**: Returns your created Orbit station info
- **Type**: Query method

**Example Usage**:
```bash
dfx canister call daopad_backend get_my_orbit_station
```

### List All Stations
- **Method**: `list_all_orbit_stations() -> Vec<OrbitStationInfo>`
- **Description**: Returns all created Orbit stations (admin function)
- **Type**: Query method

### Delete Station
- **Method**: `delete_orbit_station() -> Result<String, String>`
- **Description**: Deletes your Orbit station and both underlying canisters

**Example Usage**:
```bash
dfx canister call daopad_backend delete_orbit_station
```

## Architecture

When you call `create_orbit_station`, the backend:

1. **Creates two new canisters**:
   - Upgrader canister (manages upgrades)
   - Station canister (the actual wallet)

2. **Sets up proper controllers**:
   - DAOPad backend controls both canisters
   - Station and upgrader have cross-controller relationships
   - DAOPad backend is set as fallback controller

3. **Initializes the station**:
   - DAOPad backend canister is the admin user
   - Uses default admin/operator groups with quorum of 1
   - Creates basic wallet structure

4. **Stores station info** persistently using stable memory

## Station Configuration

Each created station has:
- **Admin User**: DAOPad backend canister principal
- **Fallback Controller**: DAOPad backend canister principal
- **Admin Quorum**: 1 (single approval needed)
- **Operator Quorum**: 1 (single approval needed)

## Integration with Other Canisters

Other canisters can call the DAOPad backend to:
- Create Orbit stations programmatically
- Manage station lifecycle
- Query station information

The created stations can be controlled by the DAOPad backend canister, allowing for automated wallet management.

## Cost Considerations

Creating an Orbit station requires:
- ~200 billion cycles total (~$0.26 USD on mainnet)
- 100B cycles for upgrader canister creation
- 100B cycles for station canister creation
- Additional cycles for WASM deployment

## Building

Before building, ensure you have the Orbit WASM files:
1. Build the Orbit project: `cd ../../../orbit && ./scripts/generate-wasm.sh station && ./scripts/generate-wasm.sh upgrader`
2. WASM files should be copied to `wasms/` directory
3. Build normally: `dfx build daopad_backend`

## Files Structure

```
daopad_backend/
├── Cargo.toml          # Updated with Orbit dependencies
├── src/lib.rs          # Main implementation with Orbit integration
├── daopad_backend.did  # Updated Candid interface
├── wasms/              # Orbit WASM modules
│   ├── station.wasm.gz
│   └── upgrader.wasm.gz
└── README.md           # This file
```