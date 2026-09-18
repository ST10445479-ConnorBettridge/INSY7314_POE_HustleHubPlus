import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client.js';
import Spinner from '../../components/Spinner.jsx';
import Alert from '../../components/Alert.jsx';
import EmptyState from '../../components/EmptyState.jsx';

export default function FreelancerGigs() {
  const [gigs, setGigs] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    setError('');
    try {
      const data = await api.myGigs();
      setGigs(data.data.gigs || []);
    } catch (err) {
      setError(err.message);
      setGigs([]);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this gig permanently? Related bookings will also be removed.')) {
      return;
    }
    try {
      await api.deleteGig(id);
      setNotice('Gig deleted.');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (gigs === null) return <Spinner />;

  return (
    <div>
      <div className="toolbar">
        <h2>My gigs</h2>
        <Link to="/dashboard/new-gig" className="btn btn-primary btn-sm">
          + New gig
        </Link>
      </div>

      {notice && <Alert kind="success">{notice}</Alert>}
      {error && <Alert>{error}</Alert>}

      {gigs.length === 0 ? (
        <EmptyState title="You have not created any gigs yet">
          Create your first listing to start getting booked.
        </EmptyState>
      ) : (
        <div className="list">
          {gigs.map((gig) => (
            <div className="card list-item" key={gig.id}>
              <div className="list-item-main">
                <h3>{gig.title}</h3>
                <p className="muted">{gig.category}</p>
                <p>{gig.description}</p>
              </div>
              <div className="list-item-meta">
                <span className="gig-price">${gig.price}</span>
                <span className="badge">{gig.status}</span>
              </div>
              <div className="list-item-actions">
                <Link to={`/gigs/${gig.id}`} className="btn btn-outline btn-sm">
                  View
                </Link>
                <Link to={`/dashboard/edit-gig/${gig.id}`} className="btn btn-outline btn-sm">
                  Edit
                </Link>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDelete(gig.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}