This project is the "Internet Computer Portfolio Index" (ICPI). It's a token that represents a basket of assets that are kept proportional to the dollar value of locked liquidity that the token has.

The amount of 'Locked Liquidity' I'm referencing is queried from the kong_locker project (../kong_locker/). Query kong_locker_backend (eazgb-giaaa-aaaap-qqc2q-cai) for lock canisters, then kongswap_backend (2ipq2-uqaaa-aaaar-qailq-cai) for user_balances. Filter results for [ALEX, ZERO, KONG, BOB] tokens.

The amount included in this index is limited to approved tokens right now, e.g., right now the distribution looks like this:

 ```

Token Distribution (7 tokens)

Token	TVL Contribution	Token Value	% of Total	LP Pools	Distribution

⭐ ALEX

	$22.5K	$11.2K	48.57%	2	

⭐ ICP

	$11.9K	$6.0K	25.74%	4	

⭐ ckUSDT

	$11.2K	$5.6K	24.20%	2	

⚡ ZERO

	$640.89	$320.45	1.38%	1	

🔥 KONG

	$48.71	$24.35	0.11%	1	

💎 BOB

	$2.05	$1.02	0.00%	1	

💎 dvinity

	$0.00	$0.00	0.00%	1	

```

But for now the index is only going to track [ALEX, ZERO, KONG, BOB]. So from this we'll divide up the percentage allocation of each.

ICPI is an ICRC1 token that can be minted with ckUSDT. Minting formula: `new_icpi = (usdt_amount * current_supply) / current_tvl`. This ensures depositors get exact proportional ownership - contribute 9.09% of value, get 9.09% of tokens. Initial mint: 1 ICPI = 1 USDT when supply is zero. Minted ckUSDT is held until rebalancing triggers.

Rebalancing happens every hour via ic-cdk-timers (one trade per hour):
- If ckUSDT available (>$10): buy token with largest deficit, trade size = 10% of deficit
- Else if tokens over-allocated: sell most overweight token to ckUSDT, trade size = 10% of excess
- All trades go through ckUSDT as intermediary
- Sequential execution only (no batching) - required by Kongswap design

Redemption burns ICPI and returns proportional tokens - burn 1% of ICPI supply, receive 1% of each token holding.

Some guiding principals:

We shouldn't use stable structures or persistent storage anywhere unless absolutely necessary because we're working with real tokens and real balances and it's much safer if we just query token balances when needed so it's always perfectly accurate.

Kongswap's pools always denominate liquidity in 50/50 pools that either denominate in ckUSDT or ICP, which is great because we know locked liquidity dollar values are always pegged to a 50/50 ratio of hard assets as a even standard. It's also great because we make all trades with ckUSDT and auto-routing is well handled. 

We should never guess types. Reference ./kong-reference/ for Kongswap source code and ../kong_locker/ for lock canister details. Always test with dfx commands first before implementing.

Development workflow - always deploy and test on mainnet:
- After implementing features, deploy with: `./deploy.sh --network ic`
- Test all functions directly on mainnet using dfx commands
- No need for local testing - we're experimenting with small amounts
- This enables real integration testing with kong_locker and Kongswap 