import { NavLink, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

export function DashboardHome() {
  const { role } = useAuth();
  return <Navigate replace to={role === 'freelancer' ? '/dashboard/gigs' : '/dashboard/bookings'} />;
}

export default function DashboardLayout() {
  const { role, user } = useAuth();

  if (role === 'admin') {
    return <Navigate to="/" replace />;
  }

  const tabs =
    role === 'freelancer'
      ? [
          { to: '/dashboard/gigs', label: 'My Gigs', end: false },
          { to: '/dashboard/bookings', label: 'Bookings', end: false },
          { to: '/dashboard/income', label: 'Income', end: false },
        ]
      : [{ to: '/dashboard/bookings', label: 'My Bookings', end: false }];

  const defaultPath = role === 'freelancer' ? '/dashboard/gigs' : '/dashboard/bookings';

  return (
    <div className="dashboard">
      <div className="dashboard-head">
        <div>
          <h1>Dashboard</h1>
          <p className="muted">
            Signed in as {user.name} ({role})
          </p>
        </div>
        <NavLink to="/" className="btn btn-outline btn-sm">
          Browse gigs
        </NavLink>
      </div>

      <nav className="tabs">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) => `tab ${isActive ? 'tab-active' : ''}`}
          >
            {t.label}
          </NavLink>
        ))}
      </nav>

      <div className="dashboard-body">
        <Outlet />
      </div>
    </div>
  );
}