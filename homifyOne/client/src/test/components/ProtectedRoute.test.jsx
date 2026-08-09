import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useAuth } from '../../context/AuthContext';

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

function renderProtected({ roles, role } = {}) {
  return render(
    <MemoryRouter initialEntries={['/private']}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route
          path="/private"
          element={
            <ProtectedRoute roles={roles} role={role}>
              <div>Secret Content</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  it('shows a loading state while auth is still resolving', () => {
    useAuth.mockReturnValue({ user: null, loading: true });
    renderProtected({ role: 'buyer' });
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByText('Secret Content')).not.toBeInTheDocument();
  });

  it('redirects to /login when there is no authenticated user', () => {
    useAuth.mockReturnValue({ user: null, loading: false });
    renderProtected({ role: 'buyer' });
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('redirects to /login when the user role is not in the allowed list', () => {
    useAuth.mockReturnValue({ user: { role: 'supplier' }, loading: false });
    renderProtected({ roles: ['buyer', 'developer'] });
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('renders the protected content when the role matches a single required role', () => {
    useAuth.mockReturnValue({ user: { role: 'buyer' }, loading: false });
    renderProtected({ role: 'buyer' });
    expect(screen.getByText('Secret Content')).toBeInTheDocument();
  });

  it('renders the protected content when the role is in the allowed roles list', () => {
    useAuth.mockReturnValue({ user: { role: 'developer' }, loading: false });
    renderProtected({ roles: ['buyer', 'developer'] });
    expect(screen.getByText('Secret Content')).toBeInTheDocument();
  });

  it('renders the protected content for any authenticated user when no role restriction is given', () => {
    useAuth.mockReturnValue({ user: { role: 'admin' }, loading: false });
    renderProtected({});
    expect(screen.getByText('Secret Content')).toBeInTheDocument();
  });
});
