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

import api from '../api/client.js';
import GigForm from '../pages/dashboard/GigForm.jsx';
import { renderWithProviders } from '../test/utils.jsx';

describe('GigForm (create)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders all gig fields (component rendering)', () => {
    renderWithProviders(<GigForm />, {
      route: '/dashboard/new-gig',
      path: '/dashboard/new-gig',
    });

    expect(screen.getByLabelText('Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Category')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
    expect(screen.getByLabelText('Price (USD)')).toBeInTheDocument();
    expect(screen.getByLabelText('Delivery days')).toBeInTheDocument();
  });

  it('validates input and creates a gig with valid data (user interaction)', async () => {
    api.createGig.mockResolvedValue({ data: { gig: { id: 'g9' } } });
    const user = userEvent.setup();

    renderWithProviders(<GigForm />, {
      route: '/dashboard/new-gig',
      path: '/dashboard/new-gig',
    });

    await user.type(screen.getByLabelText('Title'), 'Logo Design');
    await user.type(screen.getByLabelText('Category'), 'Design');
    await user.type(screen.getByLabelText('Description'), 'A complete brand identity with unlimited revisions.');
    await user.type(screen.getByLabelText('Price (USD)'), '150');
    await user.click(screen.getByRole('button', { name: 'Create gig' }));

    expect(api.createGig).toHaveBeenCalledWith({
      title: 'Logo Design',
      description: 'A complete brand identity with unlimited revisions.',
      category: 'Design',
      price: 150,
      deliveryDays: 1,
    });
  });

  it('does not submit when validation fails', async () => {
    const user = userEvent.setup();

    renderWithProviders(<GigForm />, {
      route: '/dashboard/new-gig',
      path: '/dashboard/new-gig',
    });

    await user.type(screen.getByLabelText('Title'), 'ab');
    await user.click(screen.getByRole('button', { name: 'Create gig' }));

    expect(screen.getByText('Title must be at least 3 characters')).toBeInTheDocument();
    expect(screen.getByText('Description must be at least 10 characters')).toBeInTheDocument();
    expect(api.createGig).not.toHaveBeenCalled();
  });
});