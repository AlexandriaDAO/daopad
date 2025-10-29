import React from 'react';
import { useOutletContext } from 'react-router-dom';
import UnifiedRequests from '../../components/orbit/UnifiedRequests';

/**
 * DaoInvoices - Shows transfer requests (invoices/payments) from Orbit Station
 * Pre-filtered to show only Transfer domain requests
 */
export default function DaoInvoices() {
  const { token, identity } = useOutletContext<any>();

  return (
    <UnifiedRequests
      tokenId={token.canister_id}
      identity={identity}
      defaultDomain="transfers"
    />
  );
}
