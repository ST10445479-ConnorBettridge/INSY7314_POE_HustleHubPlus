import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
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

import api from '../api/client.js';
import GigDetail from '../pages/GigDetail.jsx';
import { renderWithProviders, seedAuthenticatedUser } from '../test/utils.jsx';

const gig = {
  id: 'g1',
  title: 'Professional Logo Design',
  description: 'Modern branding and logo design.',
  category: 'Design',
  price: 150,
  deliveryDays: 3,
  owner: 'owner-1',
  ownerName: 'Zane Designer',
};

describe('GigDetail booking flow', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('shows the gig details to a visitor (component rendering)', async () => {
    api.getGig.mockResolvedValue({ data: { gig } });
    renderWithProviders(<GigDetail />, {
      route: '/gigs/g1',
      path: '/gigs/:id',
    });

    expect(await screen.findByText('Professional Logo Design')).toBeInTheDocument();
    expect(screen.getByText('Modern branding and logo design.')).toBeInTheDocument();
    expect(screen.getByText('$150')).toBeInTheDocument();
  });

  it('lets a logged-in client make a booking and shows the simulated confirmation', async () => {
    seedAuthenticatedUser({ name: 'Alex Client', role: 'client' });
    api.getGig.mockResolvedValue({ data: { gig } });
    api.createBooking.mockResolvedValue({
      data: {
        booking: { id: 'b1', status: 'confirmed', amount: 150 },
        transaction: { reference: 'TXN-ABC123', amount: 150 },
      },
    });

    const user = userEvent.setup();
    renderWithProviders(<GigDetail />, {
      route: '/gigs/g1',
      path: '/gigs/:id',
    });

    const bookButton = await screen.findByRole('button', { name: 'Book now - $150' });
    await user.click(bookButton);

    await waitFor(() => {
      expect(api.createBooking).toHaveBeenCalledWith({ gigId: 'g1', note: '' });
    });

    expect(await screen.findByText('Booking confirmed')).toBeInTheDocument();
    expect(screen.getByText(/TXN-ABC123/)).toBeInTheDocument();
  });

  it('reveals nothing sensitive and shows a controlled error if booking fails', async () => {
    seedAuthenticatedUser({ name: 'Alex Client', role: 'client' });
    api.getGig.mockResolvedValue({ data: { gig } });
    api.createBooking.mockRejectedValue(new Error('Gig not found or no longer available'));

    const user = userEvent.setup();
    renderWithProviders(<GigDetail />, {
      route: '/gigs/g1',
      path: '/gigs/:id',
    });

    const bookButton = await screen.findByRole('button', { name: 'Book now - $150' });
    await user.click(bookButton);

    expect(await screen.findByText('Gig not found or no longer available')).toBeInTheDocument();
  });

  it('prompts a logged-out user to log in instead of showing a booking form', async () => {
    api.getGig.mockResolvedValue({ data: { gig } });
    renderWithProviders(<GigDetail />, {
      route: '/gigs/g1',
      path: '/gigs/:id',
    });

    await screen.findByText('Professional Logo Design');
    expect(screen.getByRole('link', { name: 'Log in' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Book now/ })).not.toBeInTheDocument();
  });
});