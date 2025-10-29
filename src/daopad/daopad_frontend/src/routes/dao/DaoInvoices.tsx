import { useOutletContext } from 'react-router-dom';

export default function DaoInvoices() {
    const { token } = useOutletContext<any>();

    return (
      <div>
        {/* Add your InvoicesTab component here */}
        <h2>Invoices Tab</h2>
        <p>Invoice management functionality goes here</p>
        <p>Token: {token}</p>
      </div>
    );
  }
