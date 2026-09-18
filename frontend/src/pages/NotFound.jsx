import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="auth-page">
      <div className="card auth-card">
        <h1>404</h1>
        <p className="muted">That page does not exist.</p>
        <Link to="/" className="btn btn-primary btn-block">
          Back home
        </Link>
      </div>
    </div>
  );
}