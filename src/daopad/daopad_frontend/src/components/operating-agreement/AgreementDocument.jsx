import React from 'react';
import { Card, CardContent } from '../ui/card';
import AgreementSection from './AgreementSection';

const AgreementDocument = ({ data, tokenSymbol }) => {
  const formatDate = (timestamp) => {
    return new Date(Number(timestamp) / 1_000_000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatIdentity = (identity) => {
    if (identity.length > 20) {
      return `${identity.slice(0, 10)}...${identity.slice(-8)}`;
    }
    return identity;
  };

  return (
    <Card className="max-w-4xl mx-auto">
      <CardContent className="p-8 space-y-8 font-serif text-gray-900">
        {/* Title */}
        <div className="text-center space-y-2 border-b-2 border-gray-800 pb-6">
          <h1 className="text-3xl font-bold uppercase tracking-wide">
            Operating Agreement
          </h1>
          <h2 className="text-2xl">
            {data.llc_name || `${tokenSymbol} Treasury DAO LLC`}
          </h2>
          <p className="text-sm text-gray-600">
            A {data.jurisdiction || 'Wyoming'} Limited Liability Company
          </p>
          <p className="text-xs text-gray-500">
            Generated: {formatDate(data.generated_at)}
          </p>
        </div>

        {/* Article I: Organization */}
        <AgreementSection article="I" title="Formation and Organization">
          <p className="mb-4">
            This Operating Agreement (the "Agreement") of {data.llc_name || `${tokenSymbol} Treasury DAO LLC`}{' '}
            (the "Company") is entered into and shall be effective as of {formatDate(data.generated_at)}.
          </p>
          <p className="mb-4">
            The Company is organized as a Limited Liability Company pursuant to the laws of {data.jurisdiction || 'Wyoming'}.
          </p>
          <p className="mb-4">
            The Company's governance is executed entirely through smart contracts deployed on the
            Internet Computer blockchain, specifically through Orbit Station ID:
            <code className="bg-gray-100 px-2 py-1 rounded mx-1 font-mono text-sm">
              {data.station_id}
            </code>
          </p>
        </AgreementSection>

        {/* Article II: Members */}
        <AgreementSection article="II" title="Members and Governance">
          <h4 className="font-bold text-lg mb-3">Section 2.1: Members</h4>
          <p className="mb-4">
            The Company has {data.total_members} member(s) as of the date of this Agreement.
          </p>

          <h4 className="font-bold text-lg mb-3">Section 2.2: Administrative Control</h4>
          <p className="mb-4">The Company is governed by the following administrator(s):</p>
          <ul className="list-disc list-inside space-y-2 mb-4">
            {data.admins.map((admin, idx) => (
              <li key={idx}>
                <strong>{admin.name}</strong>
                <ul className="list-none ml-6 mt-1 text-sm text-gray-700">
                  {admin.identities.map((identity, i) => (
                    <li key={i} className="font-mono">
                      Principal: {formatIdentity(identity)}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>

          {data.is_truly_decentralized ? (
            <div className="bg-green-50 border border-green-200 rounded p-4 my-4">
              <p className="text-green-800">
                ✓ <strong>True Decentralization:</strong> The sole administrator is the DAOPad governance backend,
                which executes only actions approved by community voting.
              </p>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-4 my-4">
              <p className="text-yellow-800">
                ⚠ <strong>Warning:</strong> Multiple administrators exist. (Security Score: {data.security_score}/100)
              </p>
            </div>
          )}
        </AgreementSection>

        {/* Article III: Voting */}
        <AgreementSection article="III" title="Voting Rights and Governance Procedures">
          <h4 className="font-bold text-lg mb-3">Section 3.1: Voting Power</h4>
          <p className="mb-4">
            Voting power is determined by the USD value of locked LP tokens in Kong Locker.
          </p>

          <h4 className="font-bold text-lg mb-3">Section 3.2: Operation Approval Thresholds</h4>
          <div className="space-y-4">
            {[90, 75, 70, 60, 50, 40, 30].map(threshold => {
              const ops = data.voting_thresholds.filter(vt => vt.threshold_percentage === threshold);
              if (ops.length === 0) return null;

              return (
                <div key={threshold} className="border-l-4 border-gray-300 pl-4">
                  <h5 className="font-bold text-md mb-2">{threshold}% Approval Required:</h5>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {ops.map((op, idx) => (
                      <li key={idx}>
                        <strong>{op.operation}</strong>
                        <span className="text-gray-600"> — {op.voting_duration_hours}h voting period</span>
                        <p className="ml-6 text-gray-700 italic">{op.rationale}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </AgreementSection>

        {/* Article IV: Request Policies */}
        <AgreementSection article="IV" title="Request Policies">
          <div className="space-y-4">
            {data.request_policies.slice(0, 5).map((policy, idx) => (
              <div key={idx} className="border rounded p-4 bg-gray-50">
                <div className="flex items-start justify-between mb-2">
                  <h5 className="font-bold">{policy.operation}</h5>
                  <span className={`text-xs px-2 py-1 rounded ${
                    policy.risk_level === 'Critical' ? 'bg-red-100 text-red-800' :
                    policy.risk_level === 'High' ? 'bg-orange-100 text-orange-800' :
                    policy.risk_level === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {policy.risk_level} Risk
                  </span>
                </div>
                <p className="text-sm text-gray-700 mb-2">{policy.description}</p>
                <p className="text-sm font-mono text-gray-600">Rule: {policy.approval_rule}</p>
              </div>
            ))}
            {data.request_policies.length > 5 && (
              <p className="text-sm text-gray-600 italic">
                ... and {data.request_policies.length - 5} more policies
              </p>
            )}
          </div>
        </AgreementSection>

        {/* Article V: Treasury */}
        <AgreementSection article="V" title="Treasury Management">
          <h4 className="font-bold text-lg mb-3">Section 5.1: Treasury Accounts</h4>
          <p className="mb-4">
            The Company maintains {data.accounts.length} treasury account(s) for asset management.
          </p>
          <ul className="list-disc list-inside space-y-2">
            {data.accounts.map((account, idx) => (
              <li key={idx}>
                <strong>{account.name}</strong>
                <span className="text-gray-600 text-sm ml-2">
                  ({account.blockchain} / {account.standard})
                </span>
              </li>
            ))}
          </ul>
        </AgreementSection>

        {/* Article VI: Security */}
        <AgreementSection article="VI" title="Security Posture and Compliance">
          <div className="mb-4 p-4 bg-gray-50 rounded">
            <p className="mb-2">
              <strong>Security Score:</strong> {data.security_score}/100
              <span className="ml-2 text-sm text-gray-600">({data.security_status})</span>
            </p>
            <p className="mb-2">
              <strong>Decentralization:</strong> {data.is_truly_decentralized ?
                'Fully Decentralized DAO' :
                'Partially Centralized (Multiple Admins)'}
            </p>
          </div>

          {data.critical_issues && data.critical_issues.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
              <p className="font-bold text-red-800 mb-2">Critical Issues:</p>
              <ul className="list-disc list-inside space-y-1 text-red-700">
                {data.critical_issues.map((issue, idx) => (
                  <li key={idx}>{issue}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-sm text-gray-600 font-mono mt-4">
            Station ID: {data.station_id}
            <br />
            Generated: {formatDate(data.generated_at)}
            <br />
            DAOPad Version: {data.daopad_version}
          </p>
        </AgreementSection>

        {/* Signature Block */}
        <div className="border-t-2 border-gray-800 pt-6 mt-8">
          <p className="text-sm text-gray-600 mb-8">
            This Operating Agreement is executed through smart contracts and does not require
            manual signatures. The on-chain state of the Orbit Station canister constitutes
            the authoritative version of this agreement.
          </p>
          <p className="text-xs text-gray-500 text-center">
            Generated by DAOPad v{data.daopad_version} | {formatDate(data.generated_at)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default AgreementDocument;
