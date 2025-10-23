import React from 'react';
import { useOutletContext } from 'react-router-dom';
import UnifiedRequests from '../../components/orbit/UnifiedRequests';

export default function DaoActivity() {
  const { token, identity } = useOutletContext<any>();

  return <UnifiedRequests tokenId={token.canister_id} identity={identity} />;
}
