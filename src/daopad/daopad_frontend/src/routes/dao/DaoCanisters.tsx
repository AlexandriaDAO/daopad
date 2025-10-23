import React from 'react';
import { useOutletContext } from 'react-router-dom';
import CanistersTab from '../../components/canisters/CanistersTab';

export default function DaoCanisters() {
  const { token, orbitStation, identity } = useOutletContext<any>();

  return (
    <CanistersTab
      token={token}
      stationId={orbitStation?.station_id || null}
      identity={identity}
    />
  );
}
