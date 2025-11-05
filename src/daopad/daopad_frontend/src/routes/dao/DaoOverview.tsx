import React from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import OrbitStationPlaceholder from '../../components/orbit/OrbitStationPlaceholder';
import DAOSettings from '../../components/DAOSettings';

export default function DaoOverview() {
  const { token, orbitStation, overviewStats, identity, isAuthenticated } = useOutletContext<any>();

  return (
    <div className="space-y-6" data-testid="dao-overview">
      {/* Basic DAO information */}
      <Card className="bg-executive-darkGray border-executive-mediumGray">
        <CardHeader>
          <CardTitle className="text-executive-ivory">DAO Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold text-executive-ivory">{token.symbol} DAO</h2>
            <p className="text-executive-lightGray/70 mt-1">{token.name}</p>
            <p className="text-sm text-executive-lightGray/50 font-mono mt-2">
              Token Canister: {token.canister_id}
            </p>
          </div>

          {orbitStation ? (
            <div className="mt-4 p-4 bg-executive-mediumGray/30 rounded">
              <p className="text-sm text-executive-lightGray">
                <span className="text-executive-gold">Treasury Station:</span>{' '}
                <span className="font-mono">{orbitStation.station_id}</span>
              </p>
              <p className="text-sm text-green-600 mt-2">✓ DAO is operational</p>
            </div>
          ) : (
            <div className="mt-4">
              <OrbitStationPlaceholder tokenSymbol={token.symbol} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Treasury Summary (visible to everyone) */}
      {overviewStats && overviewStats.treasury_total_icp > 0 && (
        <Card
          className="bg-executive-darkGray border-executive-mediumGray"
          data-testid="treasury-summary"
        >
          <CardHeader>
            <CardTitle className="text-executive-ivory">💰 Treasury Summary</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <StatItem
              label="Total Value"
              value={`${formatICP(Number(overviewStats.treasury_total_icp))} ICP`}
              testId="treasury-total"
            />
            <StatItem
              label="Accounts"
              value={String(overviewStats.treasury_account_count)}
              testId="account-count"
            />
          </CardContent>
        </Card>
      )}

      {/* Governance Activity (visible to everyone) */}
      {overviewStats && (
        <Card
          className="bg-executive-darkGray border-executive-mediumGray"
          data-testid="governance-activity"
        >
          <CardHeader>
            <CardTitle className="text-executive-ivory">📊 Governance Activity</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <StatItem
              label="Active Proposals"
              value={String(overviewStats.active_proposal_count)}
              testId="active-proposals"
            />
            <StatItem
              label="Recent (30 days)"
              value={String(overviewStats.recent_proposal_count)}
              testId="recent-proposals"
            />
          </CardContent>
        </Card>
      )}

      {/* Community Stats (visible to everyone) */}
      {overviewStats && overviewStats.member_count > 0 && (
        <Card
          className="bg-executive-darkGray border-executive-mediumGray"
          data-testid="community-stats"
        >
          <CardHeader>
            <CardTitle className="text-executive-ivory">👥 Community</CardTitle>
          </CardHeader>
          <CardContent>
            <StatItem
              label="Members"
              value={String(overviewStats.member_count)}
              testId="member-count"
            />
          </CardContent>
        </Card>
      )}

      {/* Navigation cards to tabs */}
      <div className="grid md:grid-cols-3 gap-4">
        <NavCard
          to={`/dao/${token.canister_id}/treasury`}
          title="Treasury"
          description="View accounts, balances, and manage treasury assets"
          icon="💰"
        />
        <NavCard
          to={`/dao/${token.canister_id}/activity`}
          title="Activity"
          description="Recent proposals, requests, and governance activity"
          icon="📊"
        />
        <NavCard
          to={`/dao/${token.canister_id}/agreement`}
          title="Operating Agreement"
          description="View the DAO's operating agreement and bylaws"
          icon="📜"
        />
        <NavCard
          to={`/dao/${token.canister_id}/canisters`}
          title="Canisters"
          description="Manage canister infrastructure and deployments"
          icon="🔧"
        />
      </div>

      {/* DAO Settings Section */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold text-executive-ivory mb-6">Settings & Configuration</h2>
        <DAOSettings
          tokenCanisterId={token.canister_id}
          identity={identity}
          stationId={orbitStation?.station_id || null}
          tokenSymbol={token.symbol}
          tokenId={token.canister_id}
        />
      </div>
    </div>
  );
}

// Helper component for stat display
interface StatItemProps {
  label: string;
  value: string;
  testId?: string;
}

function StatItem({ label, value, testId }: StatItemProps) {
  return (
    <div data-testid={testId}>
      <p className="text-sm text-executive-lightGray/70">{label}</p>
      <p className="text-2xl font-bold text-executive-ivory mt-1">{value}</p>
    </div>
  );
}

// Format ICP with proper decimals (8 decimals = e8s)
function formatICP(e8s: number): string {
  const icp = e8s / 100_000_000;
  return icp.toFixed(2);
}

interface NavCardProps {
  to: string;
  title: string;
  description: string;
  icon: string;
}

function NavCard({ to, title, description, icon }: NavCardProps) {
  return (
    <Link to={to}>
      <Card className="bg-executive-darkGray border-executive-mediumGray hover:border-executive-gold transition-colors h-full">
        <CardContent className="pt-6">
          <div className="text-3xl mb-3">{icon}</div>
          <h3 className="text-lg font-semibold text-executive-ivory mb-2">{title}</h3>
          <p className="text-sm text-executive-lightGray/70">{description}</p>
        </CardContent>
      </Card>
    </Link>
  );
}
