import { describe, it, expect, vi } from 'vitest';
import { screen, act } from '@testing-library/react';
import { renderWithProviders, seedAuthenticatedUser } from './utils.jsx';
import { useAuth } from '../context/AuthContext.jsx';

function SessionState() {
  const { user, isAuthenticated } = useAuth();
  return <p>{isAuthenticated ? `Signed in: ${user.name}` : 'Signed out'}</p>;
}

describe('Session lifecycle', () => {
  it('does not restore a cached user without a JWT', () => {
    localStorage.setItem('hustlehub_user', JSON.stringify({ name: 'Stale User', role: 'freelancer' }));
    renderWithProviders(<SessionState />);
    expect(screen.getByText('Signed out')).toBeInTheDocument();
  });
  it('rejects an expired cached token', () => {
    seedAuthenticatedUser();
    localStorage.setItem('hustlehub_token', `test.${btoa(JSON.stringify({ exp: 1 }))}.signature`);
    renderWithProviders(<SessionState />);
    expect(screen.getByText('Signed out')).toBeInTheDocument();
  });
  it('clears the session after an API authentication failure', () => {
    seedAuthenticatedUser();
    renderWithProviders(<SessionState />);
    expect(screen.getByText('Signed in: Zane Designer')).toBeInTheDocument();
    act(() => window.dispatchEvent(new Event('hustlehub:session-expired')));
    expect(screen.getByText('Signed out')).toBeInTheDocument();
    expect(localStorage.getItem('hustlehub_token')).toBeNull();
  });
});
