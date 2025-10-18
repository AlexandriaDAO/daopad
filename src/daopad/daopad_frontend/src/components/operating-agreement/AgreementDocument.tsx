import React from 'react';
import { Card, CardContent } from '../ui/card';
import { OPERATION_THRESHOLDS, getRiskColor } from '../../constants/operationThresholds';

const AgreementDocument = ({ data, tokenSymbol, stationId }) => {
  const formatDate = () => new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const getAdmins = () => {
    // Extract admin users from security data
    const adminCheck = data.security?.checks?.find(c =>
      c.name === 'Admin User Count' || c.name?.includes('admin')
    );
    if (adminCheck?.details) {
      return adminCheck.details;
    }
    return 'Backend only';
  };

  const getOperators = () => {
    // Extract operator users from users list
    const operators = data.users?.filter(u =>
      u.groups?.some(g => g.name === 'Operator' || g.name?.includes('operator'))
    ).map(u => u.name || 'Unnamed').join(', ');
    return operators || 'None';
  };

  // Group constants (from Orbit Station spec)
  const ADMIN_GROUP_ID = "00000000-0000-4000-8000-000000000000";
  const OPERATOR_GROUP_ID = "00000000-0000-4000-8000-000000000001";

  // Helper: Categorize users by their highest role
  const categorizeMembers = (users) => {
    if (!users || users.length === 0) return {
      admins: [],
      operators: [],
      members: [],
      inactive: []
    };

    const categories = {
      admins: [],
      operators: [],
      members: [],
      inactive: []
    };

    users.forEach(user => {
      // Check status first (Candid enum deserializes as string "Active" or "Inactive")
      const isActive = user.status === 'Active';

      if (!isActive) {
        categories.inactive.push(user);
        return;
      }

      // Categorize by groups (highest role wins)
      const groupIds = user.groups?.map(g => g.id) || [];

      if (groupIds.includes(ADMIN_GROUP_ID)) {
        categories.admins.push(user);
      } else if (groupIds.includes(OPERATOR_GROUP_ID)) {
        categories.operators.push(user);
      } else {
        categories.members.push(user); // Active but no special groups
      }
    });

    return categories;
  };

  // Helper: Format principal for display (truncate middle)
  const formatPrincipal = (principal) => {
    if (!principal) return 'Unknown';
    const str = principal.toString();
    if (str.length <= 20) return str;
    return `${str.slice(0, 10)}...${str.slice(-7)}`;
  };

  // Helper: Get role display names from groups
  const getRoleDisplay = (groups) => {
    if (!groups || groups.length === 0) return 'Member';
    const roles = groups.map(g => g.name).join(', ');
    return roles;
  };

  return (
    <div className="prose prose-lg max-w-none font-serif">
      {/* Header */}
      <div className="text-center mb-8 border-b-2 border-gray-800 pb-4">
        <h1 className="text-3xl font-bold mb-2">
          LIMITED LIABILITY COMPANY OPERATING AGREEMENT
        </h1>
        <h2 className="text-xl">
          {tokenSymbol} Treasury DAO LLC
        </h2>
        <p className="text-sm text-gray-600">
          Effective Date: {formatDate()}
        </p>
        <p className="text-xs text-gray-500">
          On-Chain Reference: Station {stationId}
        </p>
      </div>

      {/* Warning if not decentralized */}
      {data.security?.overall_status === 'high_risk' && (
        <div className="bg-red-50 border-2 border-red-300 p-4 mb-6 rounded-lg">
          <h3 className="text-red-800 font-bold">⚠️ GOVERNANCE WARNING</h3>
          <p className="text-red-700">
            {data.security?.risk_summary}
          </p>
          {data.security?.critical_issues?.length > 0 && (
            <ul className="mt-2 list-disc pl-5">
              {data.security.critical_issues.map((issue, i) => (
                <li key={i} className="text-red-600">{issue.message || issue}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Article I: Formation */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold border-b border-gray-400 pb-2">
          ARTICLE I: FORMATION AND PURPOSE
        </h2>
        <div className="mt-4 space-y-3">
          <p>
            <strong>1.1 Formation.</strong> The Company is organized as a
            limited liability company under the laws of Wyoming, with its
            operations governed entirely by smart contracts deployed on the
            Internet Computer blockchain.
          </p>
          <p>
            <strong>1.2 Smart Contract Governance.</strong> This Agreement
            and all governance actions are executed through immutable smart
            contracts at Orbit Station ID <code className="bg-gray-100 px-1 rounded">{stationId}</code>, which
            serves as the authoritative source of truth for all Company operations.
          </p>
          <p>
            <strong>1.3 Purpose.</strong> The Company's purpose is to manage
            digital assets and execute transactions as directed by member
            voting through the DAOPad governance system.
          </p>
        </div>
      </section>

      {/* Article II: Members and Governance Structure */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold border-b border-gray-400 pb-2">
          ARTICLE II: MEMBERS AND GOVERNANCE STRUCTURE
        </h2>

        <div className="mt-4 space-y-3">
          <p>
            <strong>2.1 Membership Basis.</strong> Membership and voting power is determined by
            holding Kong Locker voting power for the {tokenSymbol} token.
            Voting power equals the USD value of permanently locked LP tokens
            multiplied by 100.
          </p>

          {(() => {
            const categories = categorizeMembers(data.users);

            return (
              <>
                {/* 2.2 Managing Partners (Admins) */}
                <div className="mt-6">
                  <p>
                    <strong>2.2 Managing Partners (Administrators).</strong> The following
                    individuals have full administrative authority over the Company's smart
                    contracts and may unilaterally modify this Operating Agreement through
                    on-chain governance actions:
                  </p>

                  {categories.admins.length > 0 ? (
                    <div className="pl-4 mt-3 space-y-2">
                      {categories.admins.map((admin, i) => (
                        <div key={admin.id} className="py-2 border-l-2 border-blue-400 pl-3">
                          <div className="font-semibold">{admin.name}</div>
                          <div className="text-sm text-gray-600">
                            Role: {getRoleDisplay(admin.groups)}
                          </div>
                          <div className="text-xs font-mono text-gray-500">
                            Principal: {formatPrincipal(admin.identities?.[0])}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="pl-4 mt-2 text-sm text-yellow-700 bg-yellow-50 p-2 rounded">
                      ⚠️ No administrators found. This may indicate an error in governance setup.
                    </div>
                  )}

                  <p className="mt-3 text-sm italic text-gray-600">
                    Note: Managing partners can create, approve, and execute all types of
                    requests including system upgrades, treasury transfers, and permission changes.
                    All smart contract modifications by managing partners are recorded on the
                    Internet Computer blockchain for permanent verification.
                  </p>
                </div>

                {/* 2.3 Operators */}
                {categories.operators.length > 0 && (
                  <div className="mt-6">
                    <p>
                      <strong>2.3 Operators.</strong> The following members have operational
                      permissions to propose and manage day-to-day treasury activities, subject
                      to approval thresholds defined in Article III:
                    </p>
                    <div className="pl-4 mt-3 space-y-2">
                      {categories.operators.map((op, i) => (
                        <div key={op.id} className="py-2 border-l-2 border-green-400 pl-3">
                          <div className="font-semibold">{op.name}</div>
                          <div className="text-sm text-gray-600">
                            Role: {getRoleDisplay(op.groups)}
                          </div>
                          <div className="text-xs font-mono text-gray-500">
                            Principal: {formatPrincipal(op.identities?.[0])}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2.4 General Members */}
                {categories.members.length > 0 && (
                  <div className="mt-6">
                    <p>
                      <strong>2.4 General Members.</strong> The following individuals are
                      registered members with voting rights proportional to their Kong Locker
                      voting power:
                    </p>
                    <div className="pl-4 mt-3 space-y-2">
                      {categories.members.map((member, i) => (
                        <div key={member.id} className="py-2 border-l-2 border-gray-400 pl-3">
                          <div className="font-semibold">{member.name}</div>
                          <div className="text-sm text-gray-600">
                            Role: Member
                          </div>
                          <div className="text-xs font-mono text-gray-500">
                            Principal: {formatPrincipal(member.identities?.[0])}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2.5 Inactive Members */}
                {categories.inactive.length > 0 && (
                  <div className="mt-6">
                    <p>
                      <strong>2.5 Inactive Members.</strong> The following members are currently
                      inactive and do not have operational or voting permissions:
                    </p>
                    <div className="pl-4 mt-3 space-y-2">
                      {categories.inactive.map((inactive, i) => (
                        <div key={inactive.id} className="py-2 border-l-2 border-red-400 pl-3 opacity-60">
                          <div className="font-semibold">{inactive.name}</div>
                          <div className="text-sm text-gray-600">
                            Status: Inactive
                          </div>
                          <div className="text-xs font-mono text-gray-500">
                            Principal: {formatPrincipal(inactive.identities?.[0])}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2.6 Total Membership Stats */}
                <div className="mt-6 p-4 bg-gray-50 rounded">
                  <p>
                    <strong>2.6 Current Membership Summary:</strong>
                  </p>
                  <ul className="list-disc pl-8 mt-2 space-y-1">
                    <li>Managing Partners (Admins): {categories.admins.length}</li>
                    <li>Operators: {categories.operators.length}</li>
                    <li>General Members: {categories.members.length}</li>
                    <li>Inactive Members: {categories.inactive.length}</li>
                    <li><strong>Total Registered: {data.users?.length || 0}</strong></li>
                  </ul>
                </div>

                {/* 2.7 Voting Rights */}
                <div className="mt-6">
                  <p>
                    <strong>2.7 Voting Rights.</strong> Each member's voting weight
                    is proportional to their Kong Locker voting power. Proposals are
                    executed when the required threshold defined in Article III is reached.
                    Members must have active status and voting power greater than zero to
                    participate in governance votes.
                  </p>
                </div>
              </>
            );
          })()}
        </div>
      </section>

      {/* Article III: Voting Thresholds */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold border-b border-gray-400 pb-2">
          ARTICLE III: VOTING THRESHOLDS BY OPERATION TYPE
        </h2>
        <div className="mt-4">
          <p className="mb-4">
            <strong>3.1 Risk-Based Thresholds.</strong> Operations require
            different approval thresholds based on risk level:
          </p>

          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-400">
                <th className="text-left p-2">Operation</th>
                <th className="text-center p-2">Threshold</th>
                <th className="text-center p-2">Risk</th>
                <th className="text-center p-2">Duration</th>
              </tr>
            </thead>
            <tbody>
              {OPERATION_THRESHOLDS.map((op, i) => (
                <tr key={i} className="border-b border-gray-200">
                  <td className="p-2">{op.name}</td>
                  <td className="text-center p-2 font-bold">{op.threshold}%</td>
                  <td className={`text-center p-2 font-bold ${getRiskColor(op.risk)}`}>
                    {op.risk}
                  </td>
                  <td className="text-center p-2">{op.duration}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Article IV: Request Policies */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold border-b border-gray-400 pb-2">
          ARTICLE IV: REQUEST POLICIES
        </h2>
        <div className="mt-4 space-y-3">
          <p>
            <strong>4.1 Active Policies.</strong> The following {data.policies?.total_count || 0} policies
            govern request approvals:
          </p>

          {data.policies?.policies?.slice(0, 10).map((policy, i) => (
            <div key={i} className="pl-4 py-2 border-l-2 border-gray-300">
              <p className="font-semibold">{policy.operation || 'Unknown Operation'}</p>
              <p className="text-sm text-gray-600">→ {policy.approval_rule || policy.rule || 'No rule specified'}</p>
            </div>
          ))}

          {(data.policies?.total_count || 0) > 10 && (
            <p className="text-sm text-gray-500 italic">
              ... and {data.policies.total_count - 10} more policies
            </p>
          )}

          {(data.policies?.auto_approved_count || 0) > 0 && (
            <div className="bg-yellow-50 p-3 mt-4 rounded">
              <p className="text-yellow-800">
                ⚠️ {data.policies.auto_approved_count} policies are auto-approved
                (development mode)
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Article V: Treasury Management */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold border-b border-gray-400 pb-2">
          ARTICLE V: TREASURY MANAGEMENT
        </h2>
        <div className="mt-4 space-y-3">
          <p>
            <strong>5.1 Treasury Control.</strong> All treasury operations
            require approval thresholds defined in Article III based on operation risk.
            Transfer operations require {OPERATION_THRESHOLDS.find(o => o.name === 'Transfer')?.threshold || 75}%
            voting power approval to execute.
          </p>

          {/* 5.2 Treasury Accounts */}
          {data.treasury && data.treasury.accounts.length > 0 && (
            <div className="mt-6">
              <p>
                <strong>5.2 Treasury Accounts.</strong> The Company maintains the following
                treasury accounts on the Internet Computer blockchain:
              </p>

              <div className="pl-4 mt-3 space-y-4">
                {data.treasury.accounts.map((account, i) => (
                  <div key={account.account_id} className="border-l-4 border-blue-400 pl-4 py-2 bg-gray-50">
                    <h4 className="font-bold text-lg">{account.account_name}</h4>

                    {/* Account ID */}
                    <div className="text-xs text-gray-500 font-mono mb-2">
                      ID: {account.account_id}
                    </div>

                    {/* Assets and Balances */}
                    {account.assets.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-semibold">Holdings:</p>
                        <ul className="list-disc pl-6 text-sm">
                          {account.assets.map((asset, j) => (
                            <li key={j}>
                              {asset.balance_formatted} {asset.symbol}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Transfer Policy */}
                    <div className="mt-2">
                      <p className="text-sm">
                        <span className="font-semibold">Transfer Approval:</span> {account.transfer_policy}
                      </p>
                      <p className="text-sm">
                        <span className="font-semibold">Configuration Changes:</span> {account.config_policy}
                      </p>
                    </div>

                    {/* Addresses */}
                    {account.addresses.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-semibold">Account Addresses:</p>
                        <ul className="list-none pl-2 text-xs font-mono">
                          {account.addresses.map((addr, k) => (
                            <li key={k} className="break-all">
                              {addr.format}: <code className="bg-white px-1">{addr.address}</code>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5.3 Transfer Authorization */}
          <div className="mt-6">
            <p>
              <strong>5.3 Transfer Initiation and Approval.</strong>
            </p>
            <ul className="list-disc pl-8 mt-2 space-y-1">
              <li>
                <strong>Who Can Propose Transfers:</strong> {data.treasury?.backend_privileges_summary ||
                "Only authorized members with sufficient voting power can propose transfers"}
              </li>
              <li>
                <strong>Approval Process:</strong> All transfers require DAOPad community voting
                reaching the {OPERATION_THRESHOLDS.find(o => o.name === 'Transfer')?.threshold || 75}%
                threshold of total voting power. Voting period lasts {
                  OPERATION_THRESHOLDS.find(o => o.name === 'Transfer')?.duration || 48
                } hours to ensure adequate deliberation.
              </li>
              <li>
                <strong>Execution:</strong> Once the voting threshold is reached, the DAOPad backend
                submits the approved request to Orbit Station for execution. The Orbit Station
                executes the transfer according to the account's configured policy.
              </li>
            </ul>
          </div>

          {/* 5.4 Authorized Recipients (Address Book) */}
          {data.treasury && data.treasury.address_book.length > 0 && (
            <div className="mt-6">
              <p>
                <strong>5.4 Authorized Payment Recipients.</strong> The Company maintains
                an address book of {data.treasury.address_book.length} authorized recipient(s)
                for recurring or pre-approved payments:
              </p>

              <table className="w-full border-collapse mt-3">
                <thead>
                  <tr className="border-b-2 border-gray-400">
                    <th className="text-left p-2">Name</th>
                    <th className="text-left p-2">Address</th>
                    <th className="text-left p-2">Blockchain</th>
                    <th className="text-left p-2">Purpose</th>
                  </tr>
                </thead>
                <tbody>
                  {data.treasury.address_book.map((entry, i) => (
                    <tr key={entry.id} className="border-b border-gray-200">
                      <td className="p-2">{entry.name}</td>
                      <td className="p-2">
                        <code className="text-xs bg-gray-100 px-1 rounded break-all">
                          {entry.address.length > 30
                            ? `${entry.address.slice(0, 15)}...${entry.address.slice(-12)}`
                            : entry.address
                          }
                        </code>
                      </td>
                      <td className="p-2">{entry.blockchain}</td>
                      <td className="p-2">{entry.purpose || 'General'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <p className="text-sm text-gray-600 mt-2 italic">
                Note: Adding or modifying authorized recipients requires {
                  OPERATION_THRESHOLDS.find(o => o.name === 'Add Address Book Entry')?.threshold || 30
                }% voting approval.
              </p>
            </div>
          )}

          {/* 5.5 Asset Management */}
          <p className="mt-4">
            <strong>5.5 Asset Management.</strong> The Company may hold and manage multiple
            digital assets across its treasury accounts as approved by member vote. Adding
            new assets or accounts requires {
              OPERATION_THRESHOLDS.find(o => o.name === 'Add Account')?.threshold || 40
            }% voting approval. Editing existing accounts requires the configured approval
            policy for that specific account.
          </p>

          {/* 5.6 Recurring Payments (Placeholder) */}
          <p className="mt-4">
            <strong>5.6 Recurring Payments.</strong> While the Company's Orbit Station
            supports scheduled and recurring transfers, no automated payment schedules are
            currently configured. Any future recurring payments (e.g., team salaries,
            service subscriptions) must be approved through the standard governance process
            before being configured in the treasury system.
          </p>
        </div>
      </section>

      {/* Article VI: Equity Distribution */}
      {data.votingPowers && data.votingPowers.total_holders > 0 && (
        <section className="mb-8">
          <h2 className="text-2xl font-bold border-b border-gray-400 pb-2">
            ARTICLE VI: EQUITY DISTRIBUTION
          </h2>
          <div className="mt-4 space-y-3">
            <p>
              <strong>6.1 Equity Basis.</strong> Member equity is determined by voting
              power derived from permanently locked liquidity pool (LP) tokens in Kong Locker
              canisters. Voting power equals the total USD value of locked LP tokens
              containing the {tokenSymbol} token, multiplied by 100.
            </p>

            <p>
              <strong>6.2 Current Equity Distribution.</strong> As of {formatDate()},
              the Company has {data.votingPowers.total_holders} equity holder
              {data.votingPowers.total_holders !== 1 ? 's' : ''} with total voting
              power of {data.votingPowers.total_voting_power.toLocaleString()}.
            </p>

            <div className="mt-4">
              <p className="font-semibold mb-3">Member Equity Breakdown:</p>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-400">
                    <th className="text-left p-2">Member</th>
                    <th className="text-left p-2">Principal</th>
                    <th className="text-right p-2">Voting Power</th>
                    <th className="text-right p-2">Equity %</th>
                  </tr>
                </thead>
                <tbody>
                  {data.votingPowers.entries.map((entry, i) => {
                    const user = data.users?.find(u =>
                      u.identities?.[0]?.toString() === entry.user_principal
                    );
                    const userName = user?.name || 'Unregistered Member';
                    return (
                      <tr key={i} className="border-b border-gray-200">
                        <td className="p-2">{userName}</td>
                        <td className="p-2">
                          <code className="text-xs bg-gray-100 px-1 rounded">
                            {formatPrincipal(entry.user_principal)}
                          </code>
                        </td>
                        <td className="text-right p-2 font-mono">
                          {entry.voting_power.toLocaleString()}
                        </td>
                        <td className="text-right p-2 font-bold">
                          {entry.equity_percentage.toFixed(2)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-400 font-bold">
                    <td className="p-2" colSpan={2}>TOTAL</td>
                    <td className="text-right p-2 font-mono">
                      {data.votingPowers.total_voting_power.toLocaleString()}
                    </td>
                    <td className="text-right p-2">100.00%</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <p className="mt-4">
              <strong>6.3 Dynamic Equity.</strong> Equity percentages automatically
              adjust based on changes in locked LP token values and the addition or
              removal of liquidity by members. All equity calculations are performed
              on-chain and are verifiable at any time.
            </p>

            <p>
              <strong>6.4 Verification.</strong> Equity percentages can be independently
              verified by querying:
            </p>
            <ul className="list-disc pl-8 mt-2 space-y-1">
              <li>Kong Locker Factory: <code className="bg-gray-100 px-1 rounded text-sm">eazgb-giaaa-aaaap-qqc2q-cai</code></li>
              <li>KongSwap for LP positions: <code className="bg-gray-100 px-1 rounded text-sm">2ipq2-uqaaa-aaaar-qailq-cai</code></li>
              <li>DAOPad Backend for equity distribution: <code className="bg-gray-100 px-1 rounded text-sm">lwsav-iiaaa-aaaap-qp2qq-cai</code></li>
            </ul>
          </div>
        </section>
      )}

      {/* Article VII: External Canisters */}
      {data.canisters && data.canisters.total > 0 && (
        <section className="mb-8">
          <h2 className="text-2xl font-bold border-b border-gray-400 pb-2">
            ARTICLE VII: EXTERNAL CANISTER MANAGEMENT
          </h2>
          <div className="mt-4 space-y-3">
            <p>
              <strong>7.1 Managed Canisters.</strong> The Company controls {data.canisters.total} external
              canister{data.canisters.total !== 1 ? 's' : ''}:
            </p>
            <div className="pl-4 space-y-1">
              {data.canisters.canisters?.slice(0, 5).map((c, i) => (
                <div key={i}>
                  • {c.name || 'Unnamed'}: <code className="bg-gray-100 px-1 rounded text-sm">{c.canister_id}</code>
                </div>
              ))}
              {data.canisters.total > 5 && (
                <div className="text-sm text-gray-500 italic">
                  ... and {data.canisters.total - 5} more canisters
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Article VIII: Amendments and Dispute Resolution */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold border-b border-gray-400 pb-2">
          ARTICLE VIII: AMENDMENTS AND DISPUTE RESOLUTION
        </h2>
        <div className="mt-4 space-y-3">
          <p>
            <strong>8.1 Amendment Authority.</strong> This Agreement may be amended in two ways:
          </p>
          <ul className="list-disc pl-8 space-y-2">
            <li>
              <strong>Smart Contract Governance:</strong> Managing Partners (listed in Article II,
              Section 2.2) have full authority to modify smart contract rules, which constitutes
              an amendment to this Operating Agreement. All such changes are recorded on the
              blockchain and automatically reflected in this document.
            </li>
            <li>
              <strong>Community Proposals:</strong> Non-administrative changes may be proposed
              through the DAOPad governance system, requiring {
                OPERATION_THRESHOLDS.find(o => o.name === 'Edit Request Policy')?.threshold || 70
              }% member approval based on voting power.
            </li>
          </ul>

          <p className="mt-4">
            <strong>8.2 Smart Contract Supremacy.</strong> In case of any
            conflict between this document and the on-chain state, the
            blockchain state at Station {stationId} prevails. This document is
            generated from on-chain data and serves as a human-readable representation
            of the smart contract rules.
          </p>

          <p>
            <strong>8.3 Dispute Resolution.</strong> All disputes shall be
            resolved through member voting or, if necessary, binding arbitration
            under Wyoming law.
          </p>
        </div>
      </section>

      {/* Article IX: Dissolution */}
      <section className="mb-8">
        <h2 className="text-2xl font-bold border-b border-gray-400 pb-2">
          ARTICLE IX: DISSOLUTION
        </h2>
        <div className="mt-4 space-y-3">
          <p>
            <strong>9.1 Voluntary Dissolution.</strong> The Company may be
            dissolved upon a {OPERATION_THRESHOLDS.find(o => o.name === 'System Upgrade')?.threshold || 90}%
            vote of all voting power.
          </p>
          <p>
            <strong>9.2 Distribution of Assets.</strong> Upon dissolution,
            assets shall be distributed proportionally to members based on
            their voting power at the time of dissolution.
          </p>
        </div>
      </section>

      {/* Footer */}
      <div className="mt-12 pt-8 border-t-2 border-gray-800 text-center">
        <p className="text-sm text-gray-600">
          This Operating Agreement is generated from on-chain data at {formatDate()}.
        </p>
        <p className="text-xs text-gray-500 mt-2">
          Blockchain verification: Query Orbit Station {stationId} on the Internet Computer
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Document generated by DAOPad Treasury Management System
        </p>
      </div>
    </div>
  );
};

export default AgreementDocument;