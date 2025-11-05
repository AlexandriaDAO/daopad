import React from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import OrbitStationPlaceholder from '../../components/orbit/OrbitStationPlaceholder';
import DAOSettings from '../../components/DAOSettings';

export default function DaoOverview() {
  const { token, orbitStation, overviewStats, identity, isAuthenticated } = useOutletContext<any>();

  return (
    <div className="space-y-6" data-testid="dao-overview">
      {/* Compact System Overview */}
      <Card className="bg-executive-darkGray border-executive-mediumGray">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {/* Token Info */}
            <div>
              <label className="text-sm text-executive-lightGray/70">Token</label>
              <div className="font-medium text-executive-ivory mt-1">{token.symbol}</div>
            </div>

            <div>
              <label className="text-sm text-executive-lightGray/70">Name</label>
              <div className="font-medium text-executive-ivory mt-1">{token.name}</div>
            </div>

            <div className="col-span-2">
              <label className="text-sm text-executive-lightGray/70">Token Canister</label>
              <div className="font-mono text-xs text-executive-ivory mt-1">{token.canister_id}</div>
            </div>

            {/* Station Info */}
            {orbitStation ? (
              <>
                <div className="col-span-2">
                  <label className="text-sm text-executive-lightGray/70">Treasury Station</label>
                  <div className="font-mono text-xs text-executive-ivory mt-1">{orbitStation.station_id}</div>
                </div>

                <div>
                  <label className="text-sm text-executive-lightGray/70">Status</label>
                  <div className="text-sm text-green-600 mt-1">✓ Operational</div>
                </div>
              </>
            ) : (
              <div className="col-span-3">
                <OrbitStationPlaceholder tokenSymbol={token.symbol} />
              </div>
            )}

            {/* Treasury Stats */}
            {overviewStats && overviewStats.treasury_total_icp > 0 && (
              <>
                <div>
                  <label className="text-sm text-executive-lightGray/70">Treasury Value</label>
                  <div className="font-medium text-executive-ivory mt-1">
                    {formatICP(Number(overviewStats.treasury_total_icp))} ICP
                  </div>
                </div>

                <div>
                  <label className="text-sm text-executive-lightGray/70">Accounts</label>
                  <div className="font-medium text-executive-ivory mt-1">
                    {overviewStats.treasury_account_count}
                  </div>
                </div>
              </>
            )}

            {/* Governance Stats */}
            {overviewStats && (
              <>
                <div>
                  <label className="text-sm text-executive-lightGray/70">Active Proposals</label>
                  <div className="font-medium text-executive-ivory mt-1">
                    {overviewStats.active_proposal_count}
                  </div>
                </div>

                <div>
                  <label className="text-sm text-executive-lightGray/70">Recent (30d)</label>
                  <div className="font-medium text-executive-ivory mt-1">
                    {overviewStats.recent_proposal_count}
                  </div>
                </div>

                {overviewStats.member_count > 0 && (
                  <div>
                    <label className="text-sm text-executive-lightGray/70">Members</label>
                    <div className="font-medium text-executive-ivory mt-1">
                      {overviewStats.member_count}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Navigation */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link to={`/${token.canister_id}/treasury`}>
          <Card className="bg-executive-darkGray border-executive-mediumGray hover:border-executive-gold transition-colors h-full">
            <CardContent className="pt-6 text-center">
              <div className="text-2xl mb-2">💰</div>
              <div className="font-medium text-executive-ivory">Treasury</div>
            </CardContent>
          </Card>
        </Link>

        <Link to={`/${token.canister_id}/activity`}>
          <Card className="bg-executive-darkGray border-executive-mediumGray hover:border-executive-gold transition-colors h-full">
            <CardContent className="pt-6 text-center">
              <div className="text-2xl mb-2">📊</div>
              <div className="font-medium text-executive-ivory">Activity</div>
            </CardContent>
          </Card>
        </Link>

        <Link to={`/${token.canister_id}/agreement`}>
          <Card className="bg-executive-darkGray border-executive-mediumGray hover:border-executive-gold transition-colors h-full">
            <CardContent className="pt-6 text-center">
              <div className="text-2xl mb-2">📜</div>
              <div className="font-medium text-executive-ivory">Agreement</div>
            </CardContent>
          </Card>
        </Link>

        <Link to={`/${token.canister_id}/canisters`}>
          <Card className="bg-executive-darkGray border-executive-mediumGray hover:border-executive-gold transition-colors h-full">
            <CardContent className="pt-6 text-center">
              <div className="text-2xl mb-2">🔧</div>
              <div className="font-medium text-executive-ivory">Canisters</div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Settings Section */}
      <DAOSettings
        tokenCanisterId={token.canister_id}
        identity={identity}
        stationId={orbitStation?.station_id || null}
        tokenSymbol={token.symbol}
        tokenId={token.canister_id}
      />
    </div>
  );
}

// Format ICP with proper decimals (8 decimals = e8s)
function formatICP(e8s: number): string {
  const icp = e8s / 100_000_000;
  return icp.toFixed(2);
}
