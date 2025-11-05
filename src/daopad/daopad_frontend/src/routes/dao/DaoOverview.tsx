import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import OrbitStationPlaceholder from '../../components/orbit/OrbitStationPlaceholder';
import DAOSettings from '../../components/DAOSettings';

export default function DaoOverview() {
  const { token, orbitStation, overviewStats, identity, isAuthenticated } = useOutletContext<any>();

  return (
    <div className="space-y-6" data-testid="dao-overview">
      {/* System Information Card */}
      <Card className="bg-executive-darkGray border-executive-mediumGray">
        <CardHeader>
          <CardTitle className="text-executive-ivory">System Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Token Information */}
            <div className="grid grid-cols-[160px_1fr] gap-x-4 gap-y-3">
              <div className="text-sm text-muted-foreground">Token Symbol</div>
              <div className="font-medium">{token.symbol}</div>

              <div className="text-sm text-muted-foreground">Token Name</div>
              <div className="font-medium">{token.name}</div>

              <div className="text-sm text-muted-foreground">Token Canister</div>
              <div className="font-mono text-sm">{token.canister_id}</div>
            </div>

            {/* Station Information */}
            {orbitStation ? (
              <div className="border-t pt-4">
                <div className="grid grid-cols-[160px_1fr] gap-x-4 gap-y-3">
                  <div className="text-sm text-muted-foreground">Treasury Station</div>
                  <div className="font-mono text-sm">{orbitStation.station_id}</div>

                  <div className="text-sm text-muted-foreground">Status</div>
                  <div className="text-sm text-green-600">✓ Operational</div>
                </div>
              </div>
            ) : (
              <div className="border-t pt-4">
                <OrbitStationPlaceholder tokenSymbol={token.symbol} />
              </div>
            )}

            {/* Treasury Stats */}
            {overviewStats && overviewStats.treasury_total_icp > 0 && (
              <div className="border-t pt-4">
                <div className="grid grid-cols-[160px_1fr] gap-x-4 gap-y-3">
                  <div className="text-sm text-muted-foreground">Treasury Value</div>
                  <div className="font-medium">
                    {formatICP(Number(overviewStats.treasury_total_icp))} ICP
                  </div>

                  <div className="text-sm text-muted-foreground">Treasury Accounts</div>
                  <div className="font-medium">{overviewStats.treasury_account_count}</div>
                </div>
              </div>
            )}

            {/* Governance Stats */}
            {overviewStats && (
              <div className="border-t pt-4">
                <div className="grid grid-cols-[160px_1fr] gap-x-4 gap-y-3">
                  <div className="text-sm text-muted-foreground">Active Proposals</div>
                  <div className="font-medium">{overviewStats.active_proposal_count}</div>

                  <div className="text-sm text-muted-foreground">Recent Proposals</div>
                  <div className="font-medium">{overviewStats.recent_proposal_count} (last 30 days)</div>

                  {overviewStats.member_count > 0 && (
                    <>
                      <div className="text-sm text-muted-foreground">Members</div>
                      <div className="font-medium">{overviewStats.member_count}</div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
