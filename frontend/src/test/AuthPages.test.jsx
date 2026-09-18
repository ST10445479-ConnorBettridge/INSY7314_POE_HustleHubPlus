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
import Login from '../pages/Login.jsx';
import Register from '../pages/Register.jsx';
import { renderWithProviders } from '../test/utils.jsx';

const validUser = { id: 'u1', name: 'Alex Client', email: 'alex@example.com', role: 'client' };
const validToken = 'jwt-token';

describe('Login page', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders the login form (component rendering)', () => {
    renderWithProviders(<Login />, { route: '/login' });

    expect(screen.getByRole('heading', { name: 'Log in' })).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument();
  });

  it('shows a validation error and does not submit for invalid input (user interaction)', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Login />, { route: '/login' });

    await user.type(screen.getByLabelText(/Email/i), 'not-an-email');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument();
    expect(api.login).not.toHaveBeenCalled();
  });

  it('calls the API and logs the user in with valid credentials', async () => {
    api.login.mockResolvedValue({ data: { user: validUser, token: validToken } });
    const user = userEvent.setup();

    renderWithProviders(<Login />, { route: '/login' });

    await user.type(screen.getByLabelText(/Email/i), 'alex@example.com');
    await user.type(screen.getByLabelText(/Password/i), 'SecurePass1!');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    await waitFor(() => {
      expect(api.login).toHaveBeenCalledWith({ email: 'alex@example.com', password: 'SecurePass1!' });
      expect(localStorage.getItem('hustlehub_token')).toBe(validToken);
    });
  });

  it('surfaces a controlled error message when login fails', async () => {
    api.login.mockRejectedValue(new Error('Invalid email or password'));
    const user = userEvent.setup();

    renderWithProviders(<Login />, { route: '/login' });

    await user.type(screen.getByLabelText(/Email/i), 'alex@example.com');
    await user.type(screen.getByLabelText(/Password/i), 'WrongPass1!');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByText('Invalid email or password')).toBeInTheDocument();
  });
});

describe('Register page', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders both role options (component rendering)', () => {
    renderWithProviders(<Register />, { route: '/register' });

    expect(screen.getByText('Client')).toBeInTheDocument();
    expect(screen.getByText('Freelancer')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument();
  });

  it('shows validation errors for a weak password and submits with freelancer role', async () => {
    api.register.mockResolvedValue({
      data: {
        user: { id: 'u2', name: 'Mia Dev', email: 'mia@example.com', role: 'freelancer' },
        token: validToken,
      },
    });
    const user = userEvent.setup();

    renderWithProviders(<Register />, { route: '/register' });

    await user.click(screen.getByText('Freelancer'));
    await user.type(screen.getByLabelText(/Full name/i), 'Mia Dev');
    await user.type(screen.getByLabelText(/Email/i), 'mia@example.com');
    await user.type(screen.getByLabelText(/^Password/), 'weak');

    const confirmInput = screen.getByLabelText('Confirm password');
    await user.type(confirmInput, 'weak');
    await user.click(screen.getByRole('button', { name: 'Sign up' }));

    expect(screen.getByText(/At least 8 characters/)).toBeInTheDocument();
    expect(api.register).not.toHaveBeenCalled();

    const passwordInput = screen.getByLabelText(/^Password/);
    await user.clear(passwordInput);
    await user.type(passwordInput, 'StrongPass1!');
    await user.clear(confirmInput);
    await user.type(confirmInput, 'StrongPass1!');
    await user.click(screen.getByRole('button', { name: 'Sign up' }));

    await waitFor(() => {
      expect(api.register).toHaveBeenCalledWith({
        name: 'Mia Dev',
        email: 'mia@example.com',
        password: 'StrongPass1!',
        role: 'freelancer',
      });
    });
  });

  it('blocks submission when the passwords do not match', async () => {
    const user = userEvent.setup();

    renderWithProviders(<Register />, { route: '/register' });

    await user.type(screen.getByLabelText(/Full name/i), 'Mia Dev');
    await user.type(screen.getByLabelText(/Email/i), 'mia@example.com');
    await user.type(screen.getByLabelText(/^Password/), 'StrongPass1!');
    await user.type(screen.getByLabelText('Confirm password'), 'Different1!');
    await user.click(screen.getByRole('button', { name: 'Sign up' }));

    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    expect(api.register).not.toHaveBeenCalled();
  });
});