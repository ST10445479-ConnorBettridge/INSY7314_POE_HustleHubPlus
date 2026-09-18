import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../api/client.js', () => ({
  default: {
    getToken: vi.fn(() => localStorage.getItem('hustlehub_token')),
    setToken: vi.fn((token) => {
      if (token) localStorage.setItem('hustlehub_token', token);
      else localStorage.removeItem('hustlehub_token');
    }),
    login: vi.fn(),
    register: vi.fn(),
    getProfile: vi.fn(),
    listGigs: vi.fn(),
    getGig: vi.fn(),
    createGig: vi.fn(),
    updateGig: vi.fn(),
    deleteGig: vi.fn(),
    myGigs: vi.fn(),
    createBooking: vi.fn(),
    listBookings: vi.fn(),
    getBooking: vi.fn(),
    getIncome: vi.fn(),
  },
}));

import Navbar from '../components/Navbar.jsx';
import { renderWithProviders, seedAuthenticatedUser } from '../test/utils.jsx';

describe('Navbar', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows login and sign up links when logged out (component rendering)', () => {
    renderWithProviders(<Navbar />);

    expect(screen.getByRole('link', { name: 'Browse Gigs' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Log in' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign up' })).toBeInTheDocument();
    expect(screen.queryByText('Log out')).not.toBeInTheDocument();
  });

  it('shows the user name, role and logout when logged in (user interaction)', async () => {
    seedAuthenticatedUser({ name: 'Zane Designer', role: 'freelancer' });
    const user = userEvent.setup();

    renderWithProviders(<Navbar />);

    expect(screen.getByText('Zane Designer')).toBeInTheDocument();
    expect(screen.getByText('freelancer')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument();

    const logoutBtn = screen.getByRole('button', { name: 'Log out' });
    await user.click(logoutBtn);

    expect(screen.getByRole('link', { name: 'Log in' })).toBeInTheDocument();
    expect(screen.queryByText('Zane Designer')).not.toBeInTheDocument();
  });
});