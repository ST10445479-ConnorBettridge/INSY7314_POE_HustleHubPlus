import { render } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext.jsx';

export const renderWithProviders = (ui, { route = '/', path } = {}) => {
  let content = ui;
  if (path) {
    content = (
      <Routes>
        <Route path={path} element={ui} />
      </Routes>
    );
  }
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthProvider>{content}</AuthProvider>
    </MemoryRouter>
  );
};

export const seedAuthenticatedUser = ({ name = 'Zane Designer', email = 'zane@example.com', role = 'freelancer' } = {}) => {
  const user = { id: 'user-1', name, email, role };
  localStorage.setItem('hustlehub_token', 'test-token');
  localStorage.setItem('hustlehub_user', JSON.stringify(user));
  return user;
};