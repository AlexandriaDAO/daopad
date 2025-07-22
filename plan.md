  <!-- # Check balance of a specific principal
  dfx canister call ALEX icrc1_balance_of "(record {owner = principal 
  \"4vgwl-3fcra-iv6gc-oyih4-s33mm-tma3t-5fuy4-qir64-bqk5i-zlo6t-rae\"; subaccount = null})"

  Transfer ALEX Tokens

  # Transfer ALEX to another principal
  dfx canister call ALEX icrc1_transfer "(record {
    to = record {
      owner = principal \"xxxxx-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx-xxx\";
      subaccount = null
    };
    amount = 1000000000;
    fee = null;
    memo = null;
    from_subaccount = null;
    created_at_time = null
  })"
 -->
