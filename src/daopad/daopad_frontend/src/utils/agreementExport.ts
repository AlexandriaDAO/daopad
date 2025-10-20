import { OPERATION_THRESHOLDS, getOperationsByCategory, getCategories } from '../constants/operationThresholds';

export const generateMarkdown = (data, tokenSymbol, stationId) => {
  const formatDate = () => new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const getAdmins = () => {
    const adminCheck = data.security?.checks?.find(c =>
      c.name === 'Admin User Count' || c.name?.includes('admin')
    );
    return adminCheck?.details || 'Backend only';
  };

  const getOperators = () => {
    const operators = data.users?.filter(u =>
      u.groups?.some(g => g.name === 'Operator' || g.name?.includes('operator'))
    ).map(u => u.name || 'Unnamed').join(', ');
    return operators || 'None';
  };

  let md = `# LIMITED LIABILITY COMPANY OPERATING AGREEMENT

## ${tokenSymbol} Treasury DAO LLC

**Effective Date:** ${formatDate()}
**On-Chain Reference:** Station ${stationId}

---

## ARTICLE I: FORMATION AND PURPOSE

**1.1 Formation.** The Company is organized as a limited liability company under the laws of Wyoming, with its operations governed entirely by smart contracts deployed on the Internet Computer blockchain.

**1.2 Smart Contract Governance.** This Agreement and all governance actions are executed through immutable smart contracts at Orbit Station ID \`${stationId}\`, which serves as the authoritative source of truth for all Company operations.

**1.3 Purpose.** The Company's purpose is to manage digital assets and execute transactions as directed by member voting through the DAOPad governance system.

## ARTICLE II: MEMBERS AND VOTING POWER

**2.1 Membership.** Membership is determined by holding Kong Locker voting power for the ${tokenSymbol} token. Voting power equals the USD value of permanently locked LP tokens multiplied by 100.

**2.2 Current Governance Structure:**
- **Admin Control:** ${getAdmins()}
- **Operator Users:** ${getOperators()}
- **Total Users:** ${data.users?.length || 0}
- **Security Score:** ${data.security?.decentralization_score || 0}/100
${data.security?.overall_status === 'high_risk' ? `
**⚠️ GOVERNANCE WARNING:** ${data.security?.risk_summary || 'High risk detected'}` : ''}

**2.3 Voting Rights.** Each member's voting weight is proportional to their Kong Locker voting power. Proposals are executed when the required threshold is reached.

## ARTICLE III: CONDITIONS FOR AMENDING OPERATING AGREEMENT

**3.1 Amendment Authority.** This Operating Agreement is a living document that reflects the on-chain state of the ${tokenSymbol} Treasury DAO. The Agreement can be amended only through the decentralized governance process according to the following principles:

- **Community Voting Required:** All amendments require approval through weighted voting based on locked liquidity provider (LP) token value
- **Voting Power Formula:** Each member's voting power equals USD value of locked LP tokens × 100 (queried from Kong Locker)
- **Backend as Executor:** The DAOPad backend canister serves as the sole executor of approved amendments in Orbit Station
- **No Unilateral Control:** No individual or centralized authority can modify agreement terms without community approval
- **Smart Contract Enforcement:** All amendments are executed autonomously by smart contracts upon reaching voting thresholds

**3.2 Amendment Categories and Requirements.** The following ${getCategories().length} categories of operations can modify this Agreement. Each operation has specific approval requirements based on risk level:

${getCategories().map(category => {
  const operations = getOperationsByCategory(category.name);
  if (operations.length === 0) return '';

  return `### ${category.name} Operations (${operations.length})
*${category.description}*

| Operation | Modifies | Threshold | Duration | Examples |
|-----------|----------|-----------|----------|----------|
${operations.map(op =>
  `| ${op.name} | ${op.modifies.slice(0, 2).join('; ')}${op.modifies.length > 2 ? '...' : ''} | ${op.threshold}% | ${op.duration}h | ${op.examples.slice(0, 2).join('; ')} |`
).join('\n')}
`;
}).join('\n')}

**3.3 Amendment Process.** All amendments follow a standardized on-chain governance process:

1. **Proposal Creation:** Any token holder with sufficient voting power creates an on-chain proposal in DAOPad specifying the desired amendment
2. **Voting Period:** Community members vote for or against the proposal during the designated deliberation period (24-72 hours depending on operation risk)
3. **Vote Weighting:** Each vote is weighted by the member's voting power, calculated as USD value of locked LP tokens × 100 (queried from Kong Locker)
4. **Threshold Check:** At the end of the voting period, the proposal passes if yes votes exceed the required threshold percentage of total voting power
5. **Automatic Execution:** Once approved, the DAOPad backend canister autonomously executes the amendment by calling the appropriate method in Orbit Station
6. **Agreement Update:** This Operating Agreement automatically reflects the new on-chain state, as it is derived from smart contract data
7. **Irreversibility:** Most amendments (especially transfers and deletions) are irreversible and require careful deliberation before approval

**3.4 Voting Threshold Rationale.** Voting thresholds are calibrated to balance operational efficiency with security and decentralization:

- **90% - Critical System Operations:** System upgrades and disaster recovery changes require near-unanimous consent due to their impact on the entire DAO infrastructure
- **75% - Treasury Operations:** Fund transfers and account modifications require supermajority approval to prevent theft or misuse of DAO assets
- **70% - Governance Operations:** Permission and policy changes require strong consensus to prevent centralization of control
- **60% - External Canister Operations:** Canister management operations require majority-plus approval to ensure careful oversight of DAO-controlled infrastructure
- **50% - User Management:** Member and group operations require simple majority to allow efficient organizational changes while preventing unilateral control
- **40% - Asset Management:** Asset registry operations have lower thresholds as they don't directly move funds, only configure asset types
- **30% - Address Book Operations:** Trusted address management has the lowest threshold as it's primarily operational convenience and doesn't grant spending authority

**3.5 Immutable Provisions.** The following core principles cannot be amended through the on-chain governance process and would require deploying new smart contracts and forming a new legal entity:

- **Decentralized Governance Requirement:** The DAO cannot revert to centralized control or unilateral decision-making without community approval
- **Smart Contract Execution:** All decisions must be executed by autonomous smart contracts, not manual human intervention
- **Voting Power Based on Locked Liquidity:** Voting power must remain tied to locked LP token value, preventing arbitrary power allocation
- **On-Chain Transparency:** All operations, votes, and state changes must be recorded on the Internet Computer blockchain
- **Wyoming DAO LLC Legal Structure:** Changing the legal entity type requires forming a new company; the existing LLC structure is fixed
- **Internet Computer Platform:** Migrating to a different blockchain would require new smart contracts and cannot be done via amendment

**3.6 Emergency Provisions.** In the event of catastrophic failure or security compromise, the following emergency procedures apply:

- **Disaster Recovery Committee:** If configured (via 90% threshold vote), a designated committee can restore the DAO from backup snapshots without standard voting if the Station becomes inaccessible
- **System Restore:** Snapshot restoration requires 90% approval in normal circumstances, but the Disaster Recovery Committee can act independently in true emergencies
- **Emergency Threshold:** The Disaster Recovery Committee itself requires quorum vote (specified in committee configuration) to execute emergency operations
- **No Bypass of Governance:** Emergency provisions do not allow bypassing governance for normal operations, only for disaster recovery when the standard process is unavailable

## ARTICLE IV: REQUEST POLICIES

**4.1 Active Policies:** ${data.policies?.total_count || 0} policies govern request approvals.
${data.policies?.auto_approved_count > 0 ? `
⚠️ ${data.policies.auto_approved_count} policies are auto-approved (development mode)
` : ''}

${data.policies?.policies?.slice(0, 10).map(p =>
  `- **${p.operation || 'Unknown'}**: ${p.approval_rule || p.rule || 'No rule specified'}`
).join('\n') || '- No policies configured'}

${(data.policies?.total_count || 0) > 10 ? `
*... and ${data.policies.total_count - 10} more policies*` : ''}

## ARTICLE V: TREASURY MANAGEMENT

**5.1 Treasury Control.** All treasury operations require approval thresholds defined in Article III based on operation risk. Transfer operations require ${OPERATION_THRESHOLDS.find(o => o.name === 'Transfer')?.threshold || 75}% voting power approval to execute.

${data.treasury && data.treasury.accounts.length > 0 ? `
**5.2 Treasury Accounts.** The Company maintains the following treasury accounts on the Internet Computer blockchain:

${data.treasury.accounts.map(acc => `
### ${acc.account_name}

- **Account ID**: \`${acc.account_id}\`
${acc.assets.length > 0 ? `- **Holdings**:
${acc.assets.map(asset => `  - ${asset.balance_formatted} ${asset.symbol}`).join('\n')}` : ''}
- **Transfer Approval**: ${acc.transfer_policy}
- **Configuration Changes**: ${acc.config_policy}
${acc.addresses.length > 0 ? `- **Account Addresses**:
${acc.addresses.map(addr => `  - ${addr.format}: \`${addr.address}\``).join('\n')}` : ''}
`).join('\n')}
` : ''}

**5.3 Transfer Initiation and Approval.**

- **Who Can Propose Transfers**: ${data.treasury?.backend_privileges_summary || "Only authorized members with sufficient voting power can propose transfers"}
- **Approval Process**: All transfers require DAOPad community voting reaching the ${OPERATION_THRESHOLDS.find(o => o.name === 'Transfer')?.threshold || 75}% threshold of total voting power. Voting period lasts ${OPERATION_THRESHOLDS.find(o => o.name === 'Transfer')?.duration || 48} hours.
- **Execution**: Once the voting threshold is reached, the DAOPad backend submits the approved request to Orbit Station for execution.

${data.treasury && data.treasury.address_book.length > 0 ? `
**5.4 Authorized Payment Recipients.** The Company maintains an address book of ${data.treasury.address_book.length} authorized recipient(s):

| Name | Address | Blockchain | Purpose |
|------|---------|------------|---------|
${data.treasury.address_book.map(entry =>
  `| ${entry.name} | \`${entry.address}\` | ${entry.blockchain} | ${entry.purpose || 'General'} |`
).join('\n')}

*Note: Adding or modifying authorized recipients requires ${OPERATION_THRESHOLDS.find(o => o.name === 'Add Address Book Entry')?.threshold || 30}% voting approval.*
` : ''}

**5.5 Asset Management.** The Company may hold and manage multiple digital assets across its treasury accounts as approved by member vote. Adding new assets or accounts requires ${OPERATION_THRESHOLDS.find(o => o.name === 'Add Account')?.threshold || 40}% voting approval.

**5.6 Recurring Payments.** While the Company's Orbit Station supports scheduled and recurring transfers, no automated payment schedules are currently configured. Any future recurring payments must be approved through the standard governance process.

${data.votingPowers && data.votingPowers.total_holders > 0 ? `
## ARTICLE VI: EQUITY DISTRIBUTION

**6.1 Equity Basis.** Member equity is determined by voting power derived from permanently locked liquidity pool (LP) tokens in Kong Locker canisters. Voting power equals the total USD value of locked LP tokens containing the ${tokenSymbol} token, multiplied by 100.

**6.2 Current Equity Distribution.** As of ${formatDate()}, the Company has ${data.votingPowers.total_holders} equity holder${data.votingPowers.total_holders !== 1 ? 's' : ''} with total voting power of ${data.votingPowers.total_voting_power.toLocaleString()}.

### Member Equity Breakdown:

| Member | Principal | Voting Power | Equity % |
|--------|-----------|--------------|----------|
${data.votingPowers.entries.map(entry => {
  const user = data.users?.find(u => u.identities?.[0]?.toString() === entry.user_principal);
  const userName = user?.name || 'Unregistered Member';
  return `| ${userName} | \`${entry.user_principal}\` | ${entry.voting_power.toLocaleString()} | ${entry.equity_percentage.toFixed(2)}% |`;
}).join('\n')}
| **TOTAL** | - | **${data.votingPowers.total_voting_power.toLocaleString()}** | **100.00%** |

**6.3 Dynamic Equity.** Equity percentages automatically adjust based on changes in locked LP token values and the addition or removal of liquidity by members. All equity calculations are performed on-chain and are verifiable at any time.

**6.4 Verification.** Equity percentages can be independently verified by querying:

- Kong Locker Factory: \`eazgb-giaaa-aaaap-qqc2q-cai\`
- KongSwap for LP positions: \`2ipq2-uqaaa-aaaar-qailq-cai\`
- DAOPad Backend for equity distribution: \`lwsav-iiaaa-aaaap-qp2qq-cai\`
` : ''}

${data.canisters && data.canisters.total > 0 ? `
## ARTICLE VII: EXTERNAL CANISTER MANAGEMENT

**7.1 Managed Canisters.** The Company controls ${data.canisters.total} external canister${data.canisters.total !== 1 ? 's' : ''}:

${data.canisters.canisters?.slice(0, 5).map(c =>
  `- ${c.name || 'Unnamed'}: \`${c.canister_id}\``
).join('\n') || '- No canisters'}

${data.canisters.total > 5 ? `*... and ${data.canisters.total - 5} more canisters*` : ''}
` : ''}

## ARTICLE VIII: AMENDMENTS AND DISPUTE RESOLUTION

**8.1 Amendments.** This Agreement may only be amended through on-chain governance requiring ${OPERATION_THRESHOLDS.find(o => o.name === 'Edit Request Policy')?.threshold || 70}% member approval.

**8.2 Smart Contract Authority.** In case of any conflict between this document and the on-chain state, the blockchain state at Station ${stationId} prevails.

**8.3 Dispute Resolution.** All disputes shall be resolved through member voting or, if necessary, binding arbitration under Wyoming law.

## ARTICLE IX: DISSOLUTION

**9.1 Voluntary Dissolution.** The Company may be dissolved upon a ${OPERATION_THRESHOLDS.find(o => o.name === 'System Upgrade')?.threshold || 90}% vote of all voting power.

**9.2 Distribution of Assets.** Upon dissolution, assets shall be distributed proportionally to members based on their voting power at the time of dissolution.

---

*This Operating Agreement is generated from on-chain data on ${formatDate()}.*
*Blockchain verification: Query Orbit Station ${stationId} on the Internet Computer*
*Document generated by DAOPad Treasury Management System*
`;

  return md;
};

export const downloadFile = (content, filename, mimeType) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};