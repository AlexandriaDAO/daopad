import React from 'react';
import { useOutletContext } from 'react-router-dom';
import OperatingAgreementTab from '../../components/operating-agreement/OperatingAgreementTab';

export default function DaoAgreement() {
  const { token, orbitStation, identity } = useOutletContext<any>();

  return (
    <OperatingAgreementTab
      tokenId={token.canister_id}
      stationId={orbitStation?.station_id || null}
      tokenSymbol={token.symbol}
      identity={identity}
    />
  );
}
