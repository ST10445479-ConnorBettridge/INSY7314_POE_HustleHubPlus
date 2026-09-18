import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client.js';
import GigCard from '../components/GigCard.jsx';
import Spinner from '../components/Spinner.jsx';
import Alert from '../components/Alert.jsx';
import EmptyState from '../components/EmptyState.jsx';

const CATEGORIES = ['All', 'Design', 'Web Development', 'Marketing', 'Writing'];

export default function Home() {
  const [gigs, setGigs] = useState(null);
  const [error, setError] = useState('');
  const [category, setCategory] = useState('All');

  useEffect(() => {
    let active = true;
    async function load() {
      setError('');
      try {
        const data = await api.listGigs(category === 'All' ? undefined : category);
        if (active) setGigs(data.data.gigs || []);
      } catch (err) {
        if (active) {
          setGigs([]);
          setError(err.message);
        }
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [category]);

  return (
    <div className="home">
      <section className="hero">
        <h1>Find your next freelance expert</h1>
        <p>
          Browse trusted gigs, book with one click and track everything from a single
          secure dashboard.
        </p>
        <div className="hero-actions">
          <Link to="/" className="btn btn-primary">
            Browse gigs
          </Link>
          <Link to="/register" className="btn btn-outline">
            Become a freelancer
          </Link>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <h2>Available gigs</h2>
          <div className="chips">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                className={`chip ${category === c ? 'chip-active' : ''}`}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {error && <Alert>{error}</Alert>}

        {gigs === null ? (
          <Spinner />
        ) : gigs.length === 0 ? (
          <EmptyState title="No gigs here yet">
            Check another category or come back later.
          </EmptyState>
        ) : (
          <div className="gig-grid">
            {gigs.map((gig) => (
              <GigCard key={gig.id} gig={gig} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}