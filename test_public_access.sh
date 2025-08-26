#!/bin/bash

echo "Testing public access to Orbit Station..."
echo "================================================"

# Test with anonymous principal
dfx identity use anonymous 2>/dev/null || dfx identity new anonymous --storage-mode plaintext

echo ""
echo "Testing as anonymous user..."
dfx canister --network ic call fec7w-zyaaa-aaaaa-qaffq-cai list_requests '(record {
  requester_ids = null;
  approver_ids = null;
  statuses = null;
  operation_types = null;
  expiration_from_dt = null;
  expiration_to_dt = null;
  created_from_dt = null;
  created_to_dt = null;
  paginate = opt record { offset = opt 0; limit = opt 5 };
  sort_by = opt variant { CreationDt = variant { Desc } };
  only_approvable = false;
  with_evaluation_results = false
})' 2>&1 | head -20

echo ""
echo "If you see proposals above, public access works!"
echo "If you see an error, authentication will be required."