#!/bin/bash

echo "Testing backend list_address_book_entries with correct encoding..."

# Test with the corrected nested optional encoding
dfx canister --network ic call lwsav-iiaaa-aaaap-qp2qq-cai list_address_book_entries '(
  "ysy5f-2qaaa-aaaap-qkmmq-cai",
  record {
    ids = null;
    addresses = null;
    blockchain = null;
    labels = null;
    paginate = opt record {
      offset = opt 0;
      limit = opt 100
    };
    address_formats = null;
    search_term = null
  }
)'