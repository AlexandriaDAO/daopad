import { OPERATION_THRESHOLDS } from '../constants/operationThresholds';

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

## ARTICLE III: VOTING THRESHOLDS BY OPERATION TYPE

**3.1 Risk-Based Thresholds.** Operations require different approval thresholds based on risk level:

| Operation | Threshold | Risk | Duration |
|-----------|-----------|------|----------|
${OPERATION_THRESHOLDS.map(op =>
  `| ${op.name} | ${op.threshold}% | ${op.risk} | ${op.duration}h |`
).join('\n')}

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

**5.1 Treasury Control.** All treasury operations require ${OPERATION_THRESHOLDS.find(o => o.name === 'Transfer')?.threshold || 75}% approval from voting members.

**5.2 Asset Management.** The Company may hold and manage multiple digital assets as approved by member vote.

**5.3 Transfer Authority.** Fund transfers require a ${OPERATION_THRESHOLDS.find(o => o.name === 'Transfer')?.duration || 48} hour voting period to ensure adequate deliberation.

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