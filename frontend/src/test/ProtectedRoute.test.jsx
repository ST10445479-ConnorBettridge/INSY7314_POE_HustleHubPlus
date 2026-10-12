import { describe, it, expect } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import { screen } from '@testing-library/react';
import ProtectedRoute from '../components/ProtectedRoute.jsx';
import { renderWithProviders, seedAuthenticatedUser } from './utils.jsx';

function RoutesUnderTest() {
  return <Routes>
    <Route path="/restricted" element={<ProtectedRoute roles={['freelancer']}><p>Freelancer tools</p></ProtectedRoute>} />
    <Route path="/login" element={<p>Login page</p>} />
    <Route path="/dashboard" element={<p>Client dashboard</p>} />
    <Route path="/" element={<p>Marketplace</p>} />
  </Routes>;
}
describe('Role-based navigation', () => {
  it('redirects unauthenticated visitors to login', () => {
    renderWithProviders(<RoutesUnderTest />, { route: '/restricted' });
    expect(screen.getByText('Login page')).toBeInTheDocument();
  });
  it('prevents clients from opening freelancer screens', () => {
    seedAuthenticatedUser({ role: 'client' });
    renderWithProviders(<RoutesUnderTest />, { route: '/restricted' });
    expect(screen.getByText('Client dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Freelancer tools')).not.toBeInTheDocument();
  });
  it('allows freelancers to open their tools', () => {
    seedAuthenticatedUser();
    renderWithProviders(<RoutesUnderTest />, { route: '/restricted' });
    expect(screen.getByText('Freelancer tools')).toBeInTheDocument();
  });
  it('sends a reserved admin account home instead of redirecting in a loop', () => {
    seedAuthenticatedUser({ role: 'admin' });
    renderWithProviders(<RoutesUnderTest />, { route: '/restricted' });
    expect(screen.getByText('Marketplace')).toBeInTheDocument();
  });
});
