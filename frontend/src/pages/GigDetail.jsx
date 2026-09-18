import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import Spinner from '../components/Spinner.jsx';
import Alert from '../components/Alert.jsx';

export default function GigDetail() {
  const { id } = useParams();
  const { isAuthenticated, role } = useAuth();

  const [gig, setGig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [bookingError, setBookingError] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const data = await api.getGig(id);
        if (active) {
          setGig(data.data.gig);
          setError('');
        }
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [id]);

  const handleBook = async (e) => {
    e.preventDefault();
    setBusy(true);
    setBookingError('');
    try {
      const data = await api.createBooking({ gigId: gig.id, note });
      setConfirmation(data.data);
      setNote('');
    } catch (err) {
      setBookingError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Spinner />;

  if (error && !gig) {
    return (
      <div className="detail-page">
        <Alert>{error}</Alert>
        <Link to="/" className="btn btn-outline">
          Back to gigs
        </Link>
      </div>
    );
  }

  return (
    <div className="detail-page">
      <Link to="/" className="back-link">
        &larr; Back to gigs
      </Link>

      <div className="detail-grid">
        <div className="card detail-main">
          <div className="gig-card-top">
            <span className="badge">{gig.category}</span>
            <span className="gig-price">${gig.price}</span>
          </div>
          <h1>{gig.title}</h1>
          <p className="muted">
            by {gig.ownerName || 'Freelancer'} · {gig.deliveryDays} day delivery
          </p>
          <p className="detail-desc">{gig.description}</p>
        </div>

        <div className="card detail-side">
          <h2>Book this gig</h2>
          {!isAuthenticated ? (
            <p>
              <Link to="/login" state={{ from: `/gigs/${gig.id}` }}>
                Log in
              </Link>{' '}
              as a client to book this gig.
            </p>
          ) : role !== 'client' ? (
            <p className="muted">Only client accounts can book gigs.</p>
          ) : (
            <form onSubmit={handleBook} noValidate>
              <label className="field">
                <span className="field-label">Message to the freelancer (optional)</span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows="4"
                  maxLength="500"
                  placeholder="Tell them about your project..."
                />
              </label>
              {bookingError && <Alert>{bookingError}</Alert>}
              <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
                {busy ? 'Confirming...' : `Book now - $${gig.price}`}
              </button>
              <p className="muted small">
                Payment is simulated. A transaction record is created immediately.
              </p>
            </form>
          )}

          {confirmation && (
            <div className="panel panel-success">
              <h3>Booking confirmed</h3>
              <p>
                Reference: <strong>{confirmation.transaction.reference}</strong>
              </p>
              <p>
                Amount charged: ${confirmation.transaction.amount} (simulated)
              </p>
              <Link to="/dashboard" className="btn btn-outline btn-sm">
                View in dashboard
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}