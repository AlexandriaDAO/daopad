import React from 'react';
import { getOperationsByCategory, getCategories, getRiskColor } from '../../constants/operationThresholds';

interface MutabilitySectionProps {
  data: any;
  tokenSymbol: string;
}

export const MutabilitySection: React.FC<MutabilitySectionProps> = ({ data, tokenSymbol }) => {
  const categories = getCategories();

  return (
    <section className="mb-8">
      <h2 className="text-2xl font-bold border-b border-gray-400 pb-2">
        ARTICLE III: CONDITIONS FOR AMENDING OPERATING AGREEMENT
      </h2>

      {/* 3.1 Amendment Authority */}
      <div className="mt-4 space-y-3">
        <h3 className="text-xl font-semibold">3.1 Amendment Authority</h3>
        <p>
          This Operating Agreement is a living document that reflects the on-chain state
          of the {tokenSymbol} Treasury DAO. The Agreement can be amended only through
          the decentralized governance process according to the following principles:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>Community Voting Required:</strong> All amendments require approval
            through weighted voting based on locked liquidity provider (LP) token value
          </li>
          <li>
            <strong>Voting Power Formula:</strong> Each member's voting power equals
            USD value of locked LP tokens × 100 (queried from Kong Locker)
          </li>
          <li>
            <strong>Backend as Executor:</strong> The DAOPad backend canister serves as
            the sole executor of approved amendments in Orbit Station
          </li>
          <li>
            <strong>No Unilateral Control:</strong> No individual or centralized authority
            can modify agreement terms without community approval
          </li>
          <li>
            <strong>Smart Contract Enforcement:</strong> All amendments are executed
            autonomously by smart contracts upon reaching voting thresholds
          </li>
        </ul>
      </div>

      {/* 3.2 Amendment Categories and Requirements */}
      <div className="mt-6 space-y-6">
        <h3 className="text-xl font-semibold">3.2 Amendment Categories and Requirements</h3>
        <p>
          The following {categories.length} categories of operations can modify this Agreement.
          Each operation has specific approval requirements based on risk level:
        </p>

        {categories.map((category) => {
          const operations = getOperationsByCategory(category.name);
          if (operations.length === 0) return null;

          return (
            <div key={category.name} className="border border-gray-300 rounded p-4">
              <h4 className="text-lg font-bold text-gray-800 mb-2">
                {category.name} Operations ({operations.length})
              </h4>
              <p className="text-sm text-gray-600 mb-4 italic">
                {category.description}
              </p>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-600 bg-gray-700">
                      <th className="text-left p-2 font-semibold text-gray-100">Operation</th>
                      <th className="text-left p-2 font-semibold text-gray-100">Modifies</th>
                      <th className="text-center p-2 font-semibold text-gray-100">Threshold</th>
                      <th className="text-center p-2 font-semibold text-gray-100">Duration</th>
                      <th className="text-left p-2 font-semibold text-gray-100">Examples</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operations.map((op, idx) => (
                      <tr key={idx} className="border-b border-gray-200 hover:bg-gray-700">
                        <td className="p-2 align-top">
                          <div className="font-semibold">{op.name}</div>
                          <div className={`text-xs font-bold ${getRiskColor(op.risk)}`}>
                            {op.risk}
                          </div>
                        </td>
                        <td className="p-2 align-top">
                          <ul className="list-disc pl-4 text-xs space-y-1">
                            {op.modifies.map((item, i) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ul>
                        </td>
                        <td className="text-center p-2 align-top font-bold">
                          {op.threshold}%
                        </td>
                        <td className="text-center p-2 align-top">
                          {op.duration}h
                        </td>
                        <td className="p-2 align-top">
                          <ul className="list-disc pl-4 text-xs space-y-1">
                            {op.examples.slice(0, 2).map((example, i) => (
                              <li key={i}>{example}</li>
                            ))}
                            {op.examples.length > 2 && (
                              <li className="text-gray-400 italic">
                                +{op.examples.length - 2} more
                              </li>
                            )}
                          </ul>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-3 text-xs text-gray-600 space-y-1">
                <p>
                  <strong>Proposer Requirement:</strong>{' '}
                  {operations[0]?.proposerRequirement || 'Any member with voting power'}
                </p>
                <p>
                  <strong>Effective When:</strong>{' '}
                  {operations[0]?.effectiveWhen || 'Upon execution'}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3.3 Amendment Process */}
      <div className="mt-6 space-y-3">
        <h3 className="text-xl font-semibold">3.3 Amendment Process</h3>
        <p>
          All amendments follow a standardized on-chain governance process:
        </p>
        <ol className="list-decimal pl-6 space-y-2">
          <li>
            <strong>Proposal Creation:</strong> Any token holder with sufficient voting
            power creates an on-chain proposal in DAOPad specifying the desired amendment
          </li>
          <li>
            <strong>Voting Period:</strong> Community members vote for or against the
            proposal during the designated deliberation period (24-72 hours depending
            on operation risk)
          </li>
          <li>
            <strong>Vote Weighting:</strong> Each vote is weighted by the member's voting
            power, calculated as USD value of locked LP tokens × 100 (queried from Kong Locker)
          </li>
          <li>
            <strong>Threshold Check:</strong> At the end of the voting period, the
            proposal passes if yes votes exceed the required threshold percentage of
            total voting power
          </li>
          <li>
            <strong>Automatic Execution:</strong> Once approved, the DAOPad backend
            canister autonomously executes the amendment by calling the appropriate
            method in Orbit Station
          </li>
          <li>
            <strong>Agreement Update:</strong> This Operating Agreement automatically
            reflects the new on-chain state, as it is derived from smart contract data
          </li>
          <li>
            <strong>Irreversibility:</strong> Most amendments (especially transfers
            and deletions) are irreversible and require careful deliberation before approval
          </li>
        </ol>
      </div>

      {/* 3.4 Voting Threshold Rationale */}
      <div className="mt-6 space-y-3">
        <h3 className="text-xl font-semibold">3.4 Voting Threshold Rationale</h3>
        <p>
          Voting thresholds are calibrated to balance operational efficiency with
          security and decentralization:
        </p>
        <div className="pl-4 space-y-2">
          <div>
            <strong className="text-red-600">90% - Critical System Operations:</strong>
            <span className="ml-2">
              System upgrades and disaster recovery changes require near-unanimous
              consent due to their impact on the entire DAO infrastructure
            </span>
          </div>
          <div>
            <strong className="text-orange-600">75% - Treasury Operations:</strong>
            <span className="ml-2">
              Fund transfers and account modifications require supermajority approval
              to prevent theft or misuse of DAO assets
            </span>
          </div>
          <div>
            <strong className="text-orange-600">70% - Governance Operations:</strong>
            <span className="ml-2">
              Permission and policy changes require strong consensus to prevent
              centralization of control
            </span>
          </div>
          <div>
            <strong className="text-yellow-600">60% - External Canister Operations:</strong>
            <span className="ml-2">
              Canister management operations require majority-plus approval to ensure
              careful oversight of DAO-controlled infrastructure
            </span>
          </div>
          <div>
            <strong className="text-blue-600">50% - User Management:</strong>
            <span className="ml-2">
              Member and group operations require simple majority to allow efficient
              organizational changes while preventing unilateral control
            </span>
          </div>
          <div>
            <strong className="text-green-600">40% - Asset Management:</strong>
            <span className="ml-2">
              Asset registry operations have lower thresholds as they don't directly
              move funds, only configure asset types
            </span>
          </div>
          <div>
            <strong className="text-green-600">30% - Address Book Operations:</strong>
            <span className="ml-2">
              Trusted address management has the lowest threshold as it's primarily
              operational convenience and doesn't grant spending authority
            </span>
          </div>
        </div>
      </div>

      {/* 3.5 Immutable Provisions */}
      <div className="mt-6 space-y-3">
        <h3 className="text-xl font-semibold">3.5 Immutable Provisions</h3>
        <p>
          The following core principles cannot be amended through the on-chain governance
          process and would require deploying new smart contracts and forming a new legal entity:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>Decentralized Governance Requirement:</strong> The DAO cannot revert
            to centralized control or unilateral decision-making without community approval
          </li>
          <li>
            <strong>Smart Contract Execution:</strong> All decisions must be executed by
            autonomous smart contracts, not manual human intervention
          </li>
          <li>
            <strong>Voting Power Based on Locked Liquidity:</strong> Voting power must
            remain tied to locked LP token value, preventing arbitrary power allocation
          </li>
          <li>
            <strong>On-Chain Transparency:</strong> All operations, votes, and state
            changes must be recorded on the Internet Computer blockchain
          </li>
          <li>
            <strong>Wyoming DAO LLC Legal Structure:</strong> Changing the legal entity
            type requires forming a new company; the existing LLC structure is fixed
          </li>
          <li>
            <strong>Internet Computer Platform:</strong> Migrating to a different
            blockchain would require new smart contracts and cannot be done via amendment
          </li>
        </ul>
      </div>

      {/* 3.6 Emergency Provisions */}
      <div className="mt-6 space-y-3">
        <h3 className="text-xl font-semibold">3.6 Emergency Provisions</h3>
        <p>
          In the event of catastrophic failure or security compromise, the following
          emergency procedures apply:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>Disaster Recovery Committee:</strong> If configured (via 90%
            threshold vote), a designated committee can restore the DAO from backup
            snapshots without standard voting if the Station becomes inaccessible
          </li>
          <li>
            <strong>System Restore:</strong> Snapshot restoration requires 90% approval
            in normal circumstances, but the Disaster Recovery Committee can act
            independently in true emergencies
          </li>
          <li>
            <strong>Emergency Threshold:</strong> The Disaster Recovery Committee itself
            requires quorum vote (specified in committee configuration) to execute
            emergency operations
          </li>
          <li>
            <strong>No Bypass of Governance:</strong> Emergency provisions do not allow
            bypassing governance for normal operations, only for disaster recovery
            when the standard process is unavailable
          </li>
        </ul>
      </div>
    </section>
  );
};
