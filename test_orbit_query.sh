#!/bin/bash
# Test calling Orbit Station directly to see the response format

INPUT='{
  requester_ids = null;
  approver_ids = null;
  statuses = null;
  operation_types = opt vec { variant { ManageSystemInfo } };
  expiration_from_dt = null;
  expiration_to_dt = null;
  created_from_dt = null;
  created_to_dt = null;
  paginate = opt record { offset = opt 0; limit = opt 10 };
  sort_by = opt variant { CreationDt = variant { Desc } };
  only_approvable = false;
  with_evaluation_results = false;
}'

echo "Calling Orbit Station directly..."
dfx canister --network ic call fec7w-zyaaa-aaaaa-qaffq-cai list_requests "$INPUT" 2>&1 | head -50
