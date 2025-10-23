import React from 'react';
import { useOutletContext } from 'react-router-dom';
import AccountsTable from '../../components/tables/AccountsTable';
import AddressBookPage from '../../pages/AddressBookPage';
import { Alert, AlertDescription } from '@/components/ui/alert';
import OrbitStationPlaceholder from '../../components/orbit/OrbitStationPlaceholder';

export default function DaoTreasury() {
  const { token, orbitStation, identity, isAuthenticated } = useOutletContext<any>();

  if (!orbitStation) {
    return (
      <div className="space-y-6">
        <Alert className="bg-executive-mediumGray border-executive-gold/30">
          <AlertDescription className="text-executive-lightGray">
            This DAO does not have a treasury station set up yet.
          </AlertDescription>
        </Alert>
        <OrbitStationPlaceholder tokenSymbol={token.symbol} />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="treasury-overview">
      <AccountsTable
        stationId={orbitStation.station_id}
        identity={identity}
        tokenId={token.canister_id}
        tokenSymbol={token.symbol}
        votingPower={0}
      />
      {isAuthenticated && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-executive-ivory">Saved Addresses</h3>
          <AddressBookPage identity={identity} />
        </div>
      )}
    </div>
  );
}
