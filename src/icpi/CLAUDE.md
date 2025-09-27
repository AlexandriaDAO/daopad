This project is the "Internet Computer Portfolio Index" (ICPI). It's a token that represents a basket of assets that are kept proportional to the dollar value of locked liquidity that the token has.

The amount of 'Locked Liquidity' I'm referencing is queried from the kong_locker project, which you could see here ../kong_locker.   So you query from the kong_locker_backend the list of approved assets and get their dollar value of the amount locked (reference how the kong_locker_frontend gets it if you're confused).

THe amount included in this index is limited to approved tokens right now, e.g., right now the distribution looks like this:

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

ICPI is an ICRC1 token that can be minted with USDT. The amounts are going to be proportional to the dollar amounts of tokens in the index. Example, assume all the tokens the index owns (located in the backend canister) have a current value of $1000, and for the sake of argument there's 100 ICPI in existence, someone who wants to mint has the option of doing so in increments of 0.1%. (Let's keep this increment, no more no less so the calculations remain simple). Okay so assume someone wants to mint some ICPI, they can provide 10 ckUSDT (dollar pegged) to mint 0.99 ICPI (I think that number is right since 1% of the new supply of 100.99 is a crazy decimal, but you know what I mean. The math has to be precise in the code).

Then there's the re-balancing mechanism, so every 24 hours, the index will re-balance according to the new proportions, so it will use that ckUSDT to by the tokens into the target proportions of the index.

Then during the redeem process, I havent decided on what's the easiest yet, but I think just sending the proportional tokens back to the burner, so if there's 100 ICPI and I have 1 ICPI and I want to redeem it, I can burn that 1 ICPI and recieve 1% of each token in the indexes holdings as compensation.

Some guiding principals:

We shouldn't use stable structures or persistent storage anywhere unless absolutely necessary because we're working with real tokens and real balances and it's much safer if we just query token balances when needed so it's always perfectly accurate.

Kongswap's pools always denominate liquidity in 50/50 pools that either denominate in ckUSDT or ICP, which is great because we know locked liquidity dollar values are always pegged to a 50/50 ratio of hard assets as a even standard. It's also great because we make all trades with ckUSDT and auto-routing is well handled. 

We should never guess types, and always reference the kongswap source code when knowing how to trade, and then further testing it by using dfx commands, and only after they work with dfx commands and match the output types that we expect should we implement the real thing. 







dfx deploy ICPI --network ic --argument '(variant { Init = 
record {
     token_symbol = "ICPI";
     token_name = "Internet Computer Portfolio Index";
     minting_account = record { owner = principal "'ehyav-lqaaa-aaaap-qqc2a-cai'" };
     transfer_fee = 10_000;
     metadata = vec {
        record { "icrc1:symbol"; variant { Text = "ALEX" } };
        record { "icrc1:name"; variant { Text = "Internet Computer Portfolio Index" } };
        record { "icrc1:description"; variant { Text = "A redemable basket of Liquid ICP Assets" } };
        record { "icrc1:decimals"; variant { Nat = 8 } };
        record { "icrc1:fee"; variant { Nat = 10_000 } };
        record { "icrc1:logo"; variant { Text = "data:image/svg+xml;base64,'${TOKEN_LOGO}'" } };
     };
     initial_balances = vec {};
     archive_options = record {
         num_blocks_to_archive = 3000;
         trigger_threshold = 6000;
         controller_id = principal "'ehyav-lqaaa-aaaap-qqc2a-cai'";
         cycles_for_archive_creation = opt 10000000000000;
     };
     feature_flags = opt record {
        icrc2 = true;
        icrc3 = true;
     };
     maximum_number_of_accounts = opt 10_000_000;
     accounts_overflow_trim_quantity = opt 100_000;
     max_memo_length = opt 32;
 }
})'