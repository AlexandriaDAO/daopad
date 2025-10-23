import React from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import OrbitStationPlaceholder from '../../components/orbit/OrbitStationPlaceholder';

export default function DaoOverview() {
  const { token, orbitStation, identity, isAuthenticated } = useOutletContext<any>();

  return (
    <div className="space-y-6">
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

      {/* Quick stats (if authenticated) */}
      {isAuthenticated && (
        <Card className="bg-executive-darkGray border-executive-mediumGray">
          <CardHeader>
            <CardTitle className="text-executive-ivory">Your Participation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-executive-lightGray/70">
              Connect your Kong Locker to see your voting power and participation metrics.
            </p>
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
          to={`/dao/${token.canister_id}/settings`}
          title="Settings"
          description="Manage DAO configuration and permissions"
          icon="⚙️"
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
    </div>
  );
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
