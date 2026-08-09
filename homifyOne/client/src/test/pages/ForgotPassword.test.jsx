import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import ForgotPassword from '../../pages/ForgotPassword';

vi.mock('axios');

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/forgot-password']}>
      <Routes>
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ForgotPassword page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requests an OTP and advances to step 2 on success', async () => {
    axios.post.mockResolvedValue({ data: {} });
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByPlaceholderText('you@example.com'), 'jane@example.com');
    await user.click(screen.getByRole('button', { name: /send otp/i }));

    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/auth/forgot-password'),
      { email: 'jane@example.com' }
    );
    expect(await screen.findByPlaceholderText('_ _ _ _ _ _')).toBeInTheDocument();
  });

  it('shows an error and stays on step 1 if the OTP request fails', async () => {
    axios.post.mockRejectedValue({ response: { data: { message: 'No account with that email.' } } });
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByPlaceholderText('you@example.com'), 'nobody@example.com');
    await user.click(screen.getByRole('button', { name: /send otp/i }));

    expect(await screen.findByText('No account with that email.')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('_ _ _ _ _ _')).not.toBeInTheDocument();
  });

  it('resets the password and shows a success message on step 2', async () => {
    axios.post.mockResolvedValue({ data: {} });
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByPlaceholderText('you@example.com'), 'jane@example.com');
    await user.click(screen.getByRole('button', { name: /send otp/i }));

    await screen.findByPlaceholderText('_ _ _ _ _ _');
    await user.type(screen.getByPlaceholderText('_ _ _ _ _ _'), '123456');
    await user.type(screen.getByPlaceholderText('Min. 6 characters'), 'newpassword');
    await user.click(screen.getByRole('button', { name: /reset password/i }));

    expect(axios.post).toHaveBeenLastCalledWith(
      expect.stringContaining('/auth/reset-password'),
      { email: 'jane@example.com', otp: '123456', newPassword: 'newpassword' }
    );
    expect(await screen.findByText(/password reset!/i)).toBeInTheDocument();
  });

  it('strips non-digit characters from the OTP field', async () => {
    axios.post.mockResolvedValue({ data: {} });
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByPlaceholderText('you@example.com'), 'jane@example.com');
    await user.click(screen.getByRole('button', { name: /send otp/i }));

    const otpInput = await screen.findByPlaceholderText('_ _ _ _ _ _');
    await user.type(otpInput, '12a3b4c5d6');
    expect(otpInput).toHaveValue('123456');
  });

  it('lets the user go back to step 1 to resend the OTP', async () => {
    axios.post.mockResolvedValue({ data: {} });
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByPlaceholderText('you@example.com'), 'jane@example.com');
    await user.click(screen.getByRole('button', { name: /send otp/i }));
    await screen.findByPlaceholderText('_ _ _ _ _ _');

    await user.click(screen.getByRole('button', { name: /back \/ resend otp/i }));
    expect(screen.getByRole('button', { name: /send otp/i })).toBeInTheDocument();
  });
});
