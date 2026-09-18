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
import Home from '../pages/Home.jsx';
import { renderWithProviders } from '../test/utils.jsx';

const gigs = [
  {
    id: 'g1',
    title: 'Logo Design',
    description: 'A brand new logo for your startup.',
    category: 'Design',
    price: 150,
    deliveryDays: 3,
    ownerName: 'Zane Designer',
  },
  {
    id: 'g2',
    title: 'Web App',
    description: 'Full-stack web application development.',
    category: 'Web Development',
    price: 800,
    deliveryDays: 14,
    ownerName: 'Mia Developer',
  },
];

describe('Home page', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders gig cards fetched from the API (component rendering)', async () => {
    api.listGigs.mockResolvedValue({ data: { gigs } });
    renderWithProviders(<Home />, { route: '/' });

    expect(await screen.findByText('Logo Design')).toBeInTheDocument();
    expect(screen.getByText('Web App')).toBeInTheDocument();
    expect(screen.getByText('$150')).toBeInTheDocument();
    expect(screen.getByText('$800')).toBeInTheDocument();
    expect(screen.getByText(/by Zane Designer/)).toBeInTheDocument();
  });

  it('shows an empty state when there are no gigs', async () => {
    api.listGigs.mockResolvedValue({ data: { gigs: [] } });
    renderWithProviders(<Home />, { route: '/' });

    expect(await screen.findByText('No gigs here yet')).toBeInTheDocument();
  });

  it('filters by category when a chip is clicked (user interaction)', async () => {
    api.listGigs.mockResolvedValue({ data: { gigs } });
    const user = userEvent.setup();

    renderWithProviders(<Home />, { route: '/' });
    await screen.findByText('Logo Design');

    await user.click(screen.getByRole('button', { name: 'Marketing' }));

    await waitFor(() => {
      expect(api.listGigs).toHaveBeenCalledWith({ category: 'Marketing', query: '' });
    });
  });

  it('searches when the query is typed (debounced)', async () => {
    api.listGigs.mockResolvedValue({ data: { gigs } });
    const user = userEvent.setup();

    renderWithProviders(<Home />, { route: '/' });
    await screen.findByText('Logo Design');

    await user.type(screen.getByPlaceholderText(/search by title/i), 'logo');

    await waitFor(() => {
      expect(api.listGigs).toHaveBeenLastCalledWith({ category: '', query: 'logo' });
    });
  });
});