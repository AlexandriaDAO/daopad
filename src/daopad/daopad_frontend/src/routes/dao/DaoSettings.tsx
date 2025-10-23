import React from 'react';
import { useOutletContext } from 'react-router-dom';
import DAOSettings from '../../components/DAOSettings';

export default function DaoSettings() {
  const { token, orbitStation, identity } = useOutletContext<any>();

  return (
    <DAOSettings
      tokenCanisterId={token.canister_id}
      identity={identity}
      stationId={orbitStation?.station_id || null}
      tokenSymbol={token.symbol}
      tokenId={token.canister_id}
    />
  );
}
