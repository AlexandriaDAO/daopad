import { useOutletContext } from 'react-router-dom';
import InvoicesPage from '../../pages/InvoicesPage';

export default function DaoInvoices() {
  const { token, orbitStation, identity, isAuthenticated } = useOutletContext<any>();

  // All DAOs can use invoices - no token restriction
  return (
    <InvoicesPage
      token={token}
      orbitStation={orbitStation}
      identity={identity}
      isAuthenticated={isAuthenticated}
    />
  );
}
