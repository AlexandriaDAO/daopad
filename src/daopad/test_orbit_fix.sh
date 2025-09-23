#!/bin/bash

# Test script to verify Orbit Station list_requests integration is working

echo "========================================="
echo "Testing Orbit Station list_requests Fix"
echo "========================================="

TEST_STATION="fec7w-zyaaa-aaaaa-qaffq-cai"

echo ""
echo "1. Testing direct dfx call with correct encoding:"
echo "   - Empty arrays [] for none"
echo "   - Single-wrapped arrays [array] for some with array values"
echo ""

# Test with statuses filter - WRAP the array!
echo "Testing with statuses filter (should work):"
dfx canister --network ic call $TEST_STATION list_requests '(record {
  statuses = opt vec { variant { Created } };
  created_from_dt = opt "2024-01-01T00:00:00Z";
  created_to_dt = opt "2025-12-31T23:59:59Z";
  expiration_from_dt = null;
  expiration_to_dt = null;
  operation_types = null;
  requester_ids = null;
  approver_ids = null;
  paginate = opt record { limit = opt 5; offset = null };
  sort_by = null;
  only_approvable = false;
  with_evaluation_results = false;
  deduplication_keys = null;
  tags = null
})' 2>&1 | head -20

echo ""
echo "========================================="
echo "Fix Summary:"
echo "========================================="
echo ""
echo "The issue was with how we encoded IDL.Opt(IDL.Vec(...)) fields."
echo ""
echo "❌ WRONG (what we had):"
echo "   statuses: statusVariants.length > 0 ? statusVariants : []"
echo "   This passed the raw array, causing double-wrapping errors"
echo ""
echo "✅ CORRECT (what Orbit does):"
echo "   statuses: statusVariants.length > 0 ? [statusVariants] : []"
echo "   Wrap the entire array in brackets for Some, empty array for None"
echo ""
echo "The same pattern applies to ALL optional Vec fields:"
echo "   - statuses: [array] or []"
echo "   - operation_types: [array] or []"
echo "   - requester_ids: [array] or []"
echo "   - approver_ids: [array] or []"
echo "   - deduplication_keys: [array] or []"
echo "   - tags: [array] or []"
echo ""
echo "Frontend URL: https://l7rlj-6aaaa-aaaap-qp2ra-cai.icp0.io/"
echo "Test it now - all request tabs should load without errors!"