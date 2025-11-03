#!/bin/bash

# Debug script to understand Candid deserialization issues

echo "=== Testing Direct Orbit Call ==="
dfx canister --network ic call fec7w-zyaaa-aaaaa-qaffq-cai list_requests '(record {
  statuses = null;
  paginate = opt record { limit = opt 1; offset = opt 0 };
  only_approvable = false;
  with_evaluation_results = false;
  sort_by = null;
  requester_ids = null;
  approver_ids = null;
  operation_types = null;
  expiration_from_dt = null;
  expiration_to_dt = null;
  created_from_dt = null;
  created_to_dt = null
})' --query > /tmp/orbit_response.txt 2>&1

echo "=== Orbit Response (first 100 lines) ==="
head -100 /tmp/orbit_response.txt

# Capture raw response using ic-repl for binary analysis
echo "=== Getting Raw Binary Response ==="
cat > /tmp/test_call.didc <<EOF
import service "fec7w-zyaaa-aaaaa-qaffq-cai" as orbit;

let request = record {
  statuses = null;
  paginate = opt record { limit = opt 1:nat16; offset = opt 0:nat64 };
  only_approvable = false;
  with_evaluation_results = false;
  sort_by = null;
  requester_ids = null;
  approver_ids = null;
  operation_types = null;
  expiration_from_dt = null;
  expiration_to_dt = null;
  created_from_dt = null;
  created_to_dt = null
};

let result = call orbit.list_requests(request);
result;
EOF

echo "=== Analysis Complete ==="
echo "Check /tmp/orbit_response.txt for full response"