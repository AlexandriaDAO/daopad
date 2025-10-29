"permamently locked liquidity as the 'stake'"

To register, all you need is an ICRC1 Token and a KongSwap Pool

- Locked LP be the marker for staking rewards, yes it can.
xb2XQqgLlFAQPfND9S_-vS4eRHmntT0ulDm8ugSVwyY






Just thinking here about the NFT trading idea.

Each NFT has:
- Money
- Rarity
- Content

Can be stolen:
- Battle (with money on the line)






# Orbit

-Dashboard
--Requests (we have in governance)
--Availible Assets (we have in treasury)
-Accounts
--Totally redundant imo except it adds CREATE ACCOUNT
-Transfer Requests
--has all the complex filtering which we have but should fix up.
-Address book.
--Simple but we should add. Just not as its own tab.
-Canisters
--Need all this from scratch.
-Settings
--Administration (need from scratch)
--user (done)
--user groups & permissions (need from scratch)
--approval rules (need from scatch_)
--requests (done)
--Assets (done)



We need 
-CREATE ACCOUNT

-CANISTERs
-Settings. Need all this from scratch
--user groups & permissions.
--Approval Rules


-Fix up for the transfer reqeusts.
-Simple existing address book information.


The ability to add an asset.
















Main Pitch: 


Fair Launch (Decentralized) = Great Invention
- Groups can create a shared venture.

Smart Contract (Autonomous) = Great Invention
- Software becomes its own breathing entity. 

LLC (Organization) = Great Invention
- Individuals can start a venture with minimal personal risk.

DAOs = Great Invention (unfullfilled)



Problem: Today, all exist in isolation.

Solution: Provide the rails to bring them all together.





Phase 1 (availible for any token project team member):

Current ICP Project Team Memebers:
- You want treasury allocations to be allocated by group decisions.
- You'd like to increase TVL
- You'd like to add community participation.
- You'd like to pay yourself a salary that is transparent and auditable.
- You'd like autonomous canister management, backups and peace of mind.


Phase 2 (availible for those who have migrated to true DAOs):
- Transfer investment earnings into fiat expendatures.
- Legal entity that can sign contracts, own property, and engange in buisiness.
- The ability to get corporate bank accounts.
- Team member credit cards.
- Crypto/fiat onramp/offramp rails for your revenue/expenses model.
- File taxes as a company instead of a crypto entity.





  # Send ALEX to Alexandria Reserves
  dfx canister --network ic call ysy5f-2qaaa-aaaap-qkmmq-cai icrc1_transfer '(record {
    to = record {
      owner = principal "fec7w-zyaaa-aaaaa-qaffq-cai";
      subaccount = opt blob "\3f\60\18\69\e4\8e\49\a1\92\cb\32\f5\5b\30\8a\18\00\00\00\0
  0\00\00\00\00\00\00\00\00\00\00\00\00";
    };
    amount = AMOUNT_HERE;  # 8 decimals (100000000 = 1 ALEX)
    fee = null;
    memo = null;
    created_at_time = null;
  })'

