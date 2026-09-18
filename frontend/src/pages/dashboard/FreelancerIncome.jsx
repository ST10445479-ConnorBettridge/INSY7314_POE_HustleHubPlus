import { useEffect, useState } from 'react';
import api from '../../api/client.js';
import Spinner from '../../components/Spinner.jsx';
import Alert from '../../components/Alert.jsx';
import EmptyState from '../../components/EmptyState.jsx';

export default function FreelancerIncome() {
  const [income, setIncome] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await api.getIncome();
        if (active) setIncome(data.data.income);
      } catch (err) {
        if (active) {
          setError(err.message);
          setIncome(null);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (error) return <Alert>{error}</Alert>;
  if (!income) return <Spinner />;

  return (
    <div>
      <h2>Income</h2>
      <div className="stats">
        <div className="card stat">
          <span className="stat-label">Total income</span>
          <span className="stat-value">${income.totalIncome.toLocaleString()}</span>
        </div>
        <div className="card stat">
          <span className="stat-label">Estimated tax ({(income.taxRate * 100).toFixed(1)}%)</span>
          <span className="stat-value">${income.taxEstimate.toLocaleString()}</span>
        </div>
        <div className="card stat">
          <span className="stat-label">Net income after tax</span>
          <span className="stat-value">${income.netIncome.toLocaleString()}</span>
        </div>
        <div className="card stat">
          <span className="stat-label">Transactions</span>
          <span className="stat-value">{income.transactionCount}</span>
        </div>
      </div>

      {income.transactions.length === 0 ? (
        <EmptyState title="No income recorded yet">
          Transactions from client bookings will appear here.
        </EmptyState>
      ) : (
        <div className="card table-card">
          <table className="table">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Gig</th>
                <th>Client</th>
                <th>Amount</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {income.transactions.map((t) => (
                <tr key={t.id}>
                  <td className="mono">{t.reference}</td>
                  <td>{t.gig ? t.gig.title : 'Gig'}</td>
                  <td>{t.client ? t.client.name : 'Unknown'}</td>
                  <td className="mono">${t.amount.toLocaleString()}</td>
                  <td>{new Date(t.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}