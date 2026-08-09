import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Login from '../../pages/Login';
import { useAuth } from '../../context/AuthContext';

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/buyer/dashboard" element={<div>Buyer Dashboard</div>} />
        <Route path="/developer/dashboard" element={<div>Developer Dashboard</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('Login page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('defaults to the Buyer role and submits credentials with it', async () => {
    const login = vi.fn().mockResolvedValue({ role: 'buyer' });
    useAuth.mockReturnValue({ login });
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByPlaceholderText('you@example.com'), 'jane@example.com');
    await user.type(screen.getByPlaceholderText('Enter your password'), 'secret123');
    await user.click(screen.getByRole('button', { name: /sign in to homifyone/i }));

    expect(login).toHaveBeenCalledWith('jane@example.com', 'secret123', 'buyer');
    expect(await screen.findByText('Buyer Dashboard')).toBeInTheDocument();
  });

  it('submits with the selected role after switching roles', async () => {
    const login = vi.fn().mockResolvedValue({ role: 'developer' });
    useAuth.mockReturnValue({ login });
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByRole('button', { name: /developer/i }));
    await user.type(screen.getByPlaceholderText('you@example.com'), 'dev@example.com');
    await user.type(screen.getByPlaceholderText('Enter your password'), 'secret123');
    await user.click(screen.getByRole('button', { name: /sign in to homifyone/i }));

    expect(login).toHaveBeenCalledWith('dev@example.com', 'secret123', 'developer');
    expect(await screen.findByText('Developer Dashboard')).toBeInTheDocument();
  });

  it('shows an error message and does not navigate when login fails', async () => {
    const login = vi.fn().mockRejectedValue({ response: { data: { message: 'Invalid email or password.' } } });
    useAuth.mockReturnValue({ login });
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByPlaceholderText('you@example.com'), 'jane@example.com');
    await user.type(screen.getByPlaceholderText('Enter your password'), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /sign in to homifyone/i }));

    expect(await screen.findByText('Invalid email or password.')).toBeInTheDocument();
    expect(screen.queryByText('Buyer Dashboard')).not.toBeInTheDocument();
  });

  it('toggles the password field between hidden and visible text', async () => {
    useAuth.mockReturnValue({ login: vi.fn() });
    const user = userEvent.setup();
    renderLogin();

    const passwordInput = screen.getByPlaceholderText('Enter your password');
    expect(passwordInput).toHaveAttribute('type', 'password');

    const toggleBtn = passwordInput.parentElement.querySelector('button[type="button"]');
    await user.click(toggleBtn);
    expect(passwordInput).toHaveAttribute('type', 'text');
  });
});
