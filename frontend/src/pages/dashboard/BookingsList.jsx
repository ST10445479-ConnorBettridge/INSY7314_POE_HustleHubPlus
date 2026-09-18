import { useEffect, useState } from 'react';
import api from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Spinner from '../../components/Spinner.jsx';
import Alert from '../../components/Alert.jsx';
import EmptyState from '../../components/EmptyState.jsx';

const STATUS_LABEL = {
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function BookingsList() {
  const { role } = useAuth();
  const [bookings, setBookings] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await api.listBookings();
        if (active) setBookings(data.data.bookings || []);
      } catch (err) {
        if (active) {
          setError(err.message);
          setBookings([]);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const isFreelancer = role === 'freelancer';

  return (
    <div>
      <h2>{isFreelancer ? 'Bookings on your gigs' : 'My bookings'}</h2>
      {error && <Alert>{error}</Alert>}

      {bookings === null ? (
        <Spinner />
      ) : bookings.length === 0 ? (
        <EmptyState title={isFreelancer ? 'No bookings yet' : 'You have no bookings yet'}>
          {isFreelancer
            ? 'When clients book your gigs the bookings will appear here.'
            : 'Browse gigs and book a service to see it here.'}
        </EmptyState>
      ) : (
        <div className="list">
          {bookings.map((b) => (
            <div className="card list-item" key={b.id}>
              <div className="list-item-main">
                <h3>{b.gig ? b.gig.title : 'Gig'}</h3>
                <p className="muted">
                  {isFreelancer
                    ? `Client: ${b.client ? b.client.name : 'Unknown'}`
                    : `Freelancer: ${b.freelancer ? b.freelancer.name : 'Unknown'}`}
                </p>
                {b.note && <p>"{b.note}"</p>}
                <p className="small muted">Booked on {new Date(b.createdAt).toLocaleString()}</p>
              </div>
              <div className="list-item-meta">
                <span className="gig-price">${b.amount}</span>
                <span className={`badge badge-${b.status}`}>{STATUS_LABEL[b.status] || b.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}