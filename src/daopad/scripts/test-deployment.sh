#!/bin/bash
# Post-Deployment Smoke Tests
# Tests all critical backend methods after deployment to ensure everything works

set -e

NETWORK="${1:-ic}"
BACKEND_ID="lwsav-iiaaa-aaaap-qp2qq-cai"
TEST_STATION="fec7w-zyaaa-aaaaa-qaffq-cai"

echo "================================================"
echo "Post-Deployment Smoke Tests"
echo "================================================"
echo "Network: $NETWORK"
echo "Backend: $BACKEND_ID"
echo "Test Station: $TEST_STATION"
echo ""

PASSED=0
FAILED=0
TOTAL=0

# Helper function to test a method
test_method() {
    local method="$1"
    local args="$2"
    local description="$3"

    TOTAL=$((TOTAL + 1))
    echo -n "[$TOTAL] Testing $description... "

    if dfx canister --network "$NETWORK" call "$BACKEND_ID" "$method" "$args" >/dev/null 2>&1; then
        echo "✅ PASS"
        PASSED=$((PASSED + 1))
    else
        echo "❌ FAIL"
        FAILED=$((FAILED + 1))
        echo "    Error details:"
        dfx canister --network "$NETWORK" call "$BACKEND_ID" "$method" "$args" 2>&1 | head -5 | sed 's/^/    /'
    fi
}

# Test all security check methods
echo "Testing Security Check Methods:"
test_method "check_admin_control" "(principal \"$TEST_STATION\")" "Admin Control Check"
test_method "check_treasury_control" "(principal \"$TEST_STATION\")" "Treasury Control Check"
test_method "check_governance_permissions" "(principal \"$TEST_STATION\")" "Governance Permissions Check"
test_method "check_proposal_policies" "(principal \"$TEST_STATION\")" "Proposal Policies Check"
test_method "check_external_canisters" "(principal \"$TEST_STATION\")" "External Canisters Check"
test_method "check_asset_management" "(principal \"$TEST_STATION\")" "Asset Management Check"
test_method "check_system_configuration" "(principal \"$TEST_STATION\")" "System Configuration Check"
test_method "check_operational_permissions" "(principal \"$TEST_STATION\")" "Operational Permissions Check"
test_method "perform_all_security_checks" "(principal \"$TEST_STATION\")" "Aggregated Security Check"

echo ""
echo "Testing Station Mapping Methods:"
test_method "get_orbit_station_for_token" "(principal \"$TEST_STATION\")" "Get Orbit Station"
test_method "get_backend_principal" "()" "Get Backend Principal"

echo ""
echo "Testing User Permission Methods:"
test_method "check_backend_status" "(principal \"$TEST_STATION\")" "Backend Status Check"

echo ""
echo "================================================"
echo "Test Results"
echo "================================================"
echo "Total:  $TOTAL"
echo "Passed: $PASSED ✅"
echo "Failed: $FAILED ❌"
echo ""

if [ $FAILED -eq 0 ]; then
    echo "🎉 All tests passed!"
    exit 0
else
    echo "⚠️  Some tests failed. Check backend deployment."
    exit 1
fi
