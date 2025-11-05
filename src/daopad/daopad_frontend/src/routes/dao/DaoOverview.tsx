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
          <div className="space-y-4">
            {/* Token Information */}
            <div className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-3">
              <div className="text-sm text-executive-lightGray/70">Token Symbol:</div>
              <div className="font-medium text-executive-ivory">{token.symbol}</div>

              <div className="text-sm text-executive-lightGray/70">Token Name:</div>
              <div className="font-medium text-executive-ivory">{token.name}</div>

              <div className="text-sm text-executive-lightGray/70">Token Canister:</div>
              <div className="font-mono text-sm text-executive-ivory">{token.canister_id}</div>
            </div>

            {/* Station Information */}
            {orbitStation ? (
              <>
                <div className="border-t border-executive-mediumGray/30 pt-4">
                  <div className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-3">
                    <div className="text-sm text-executive-lightGray/70">Treasury Station:</div>
                    <div className="font-mono text-sm text-executive-ivory">{orbitStation.station_id}</div>

                    <div className="text-sm text-executive-lightGray/70">Status:</div>
                    <div className="text-sm text-green-600">✓ Operational</div>
                  </div>
                </div>

                {/* Treasury & Governance Stats */}
                {overviewStats && (
                  <div className="border-t border-executive-mediumGray/30 pt-4">
                    <div className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-3">
                      {overviewStats.treasury_total_icp > 0 && (
                        <>
                          <div className="text-sm text-executive-lightGray/70">Treasury Value:</div>
                          <div className="font-medium text-executive-ivory">
                            {formatICP(Number(overviewStats.treasury_total_icp))} ICP
                          </div>

                          <div className="text-sm text-executive-lightGray/70">Treasury Accounts:</div>
                          <div className="font-medium text-executive-ivory">
                            {overviewStats.treasury_account_count}
                          </div>
                        </>
                      )}

                      <div className="text-sm text-executive-lightGray/70">Active Proposals:</div>
                      <div className="font-medium text-executive-ivory">
                        {overviewStats.active_proposal_count}
                      </div>

                      <div className="text-sm text-executive-lightGray/70">Recent Proposals:</div>
                      <div className="font-medium text-executive-ivory">
                        {overviewStats.recent_proposal_count} (last 30 days)
                      </div>

                      {overviewStats.member_count > 0 && (
                        <>
                          <div className="text-sm text-executive-lightGray/70">Members:</div>
                          <div className="font-medium text-executive-ivory">
                            {overviewStats.member_count}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="border-t border-executive-mediumGray/30 pt-4">
                <OrbitStationPlaceholder tokenSymbol={token.symbol} />
              </div>
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
