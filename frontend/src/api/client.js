const API_BASE = import.meta.env.VITE_API_BASE || '/api';

const TOKEN_KEY = 'hustlehub_token';

const getToken = () => localStorage.getItem(TOKEN_KEY);
const setToken = (token) => {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
};

const request = async (path, { method = 'GET', body, auth = true } = {}) => {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && getToken()) headers.Authorization = `Bearer ${getToken()}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let payload = null;
  try {
    payload = await res.json();
  } catch (err) {
    payload = { message: 'The server returned an unreadable response. Please try again.' };
  }

  if (!res.ok) {
    throw new Error(payload.message || `Request failed with status ${res.status}`);
  }

  return payload;
};

export const api = {
  getToken,
  setToken,

  register: ({ name, email, password, role }) =>
    request('/auth/register', { method: 'POST', auth: false, body: { name, email, password, role } }),

  login: ({ email, password }) =>
    request('/auth/login', { method: 'POST', auth: false, body: { email, password } }),

  getProfile: () => request('/auth/profile'),

  listGigs: (category) => request(`/gigs${category ? `?category=${encodeURIComponent(category)}` : ''}`),
  getGig: (id) => request(`/gigs/${id}`),
  createGig: (gig) => request('/gigs', { method: 'POST', body: gig }),
  updateGig: (id, gig) => request(`/gigs/${id}`, { method: 'PUT', body: gig }),
  deleteGig: (id) => request(`/gigs/${id}`, { method: 'DELETE' }),
  myGigs: () => request('/gigs/mine'),

  createBooking: ({ gigId, note }) => request('/bookings', { method: 'POST', body: { gigId, note } }),
  listBookings: () => request('/bookings'),
  getBooking: (id) => request(`/bookings/${id}`),

  getIncome: () => request('/income'),
};

export default api;