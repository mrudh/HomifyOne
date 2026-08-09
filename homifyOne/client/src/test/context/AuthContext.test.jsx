import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import axios from 'axios';
import { AuthProvider, useAuth } from '../../context/AuthContext';

vi.mock('axios');

function mockNoSession() {
  axios.get.mockResolvedValue({ data: { user: null } });
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('starts loading and settles to no user when /auth/me has no session', async () => {
    mockNoSession();
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBe(null);
  });

  it('login stores the token and user on success', async () => {
    mockNoSession();
    axios.post.mockResolvedValue({
      data: { token: 'abc123', user: { _id: 'u1', name: 'Jane', role: 'buyer' } },
    });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let returnedUser;
    await act(async () => {
      returnedUser = await result.current.login('jane@example.com', 'pw', 'buyer');
    });

    expect(returnedUser).toEqual({ _id: 'u1', name: 'Jane', role: 'buyer' });
    expect(result.current.user).toEqual({ _id: 'u1', name: 'Jane', role: 'buyer' });
    expect(result.current.token).toBe('abc123');
    expect(localStorage.getItem('token')).toBe('abc123');
  });

  it('login rejects and leaves state untouched on invalid credentials', async () => {
    mockNoSession();
    axios.post.mockRejectedValue({ response: { data: { message: 'Invalid email or password.' } } });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(
      act(async () => {
        await result.current.login('bad@example.com', 'wrong', 'buyer');
      })
    ).rejects.toBeTruthy();

    expect(result.current.user).toBe(null);
    expect(localStorage.getItem('token')).toBe(null);
  });

  it('logout clears the user, token and localStorage', async () => {
    mockNoSession();
    axios.post.mockResolvedValueOnce({
      data: { token: 'abc123', user: { _id: 'u1', role: 'buyer' } },
    });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.login('jane@example.com', 'pw', 'buyer');
    });
    expect(result.current.user).not.toBe(null);

    axios.post.mockResolvedValueOnce({ data: {} });
    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBe(null);
    expect(result.current.token).toBe(null);
    expect(localStorage.getItem('token')).toBe(null);
  });

  it('wipes stale buyer scratch data (basket, cached recs) when a different user logs in', async () => {
    localStorage.setItem('basketOwner', 'previous-user');
    localStorage.setItem('basket', JSON.stringify([{ name: 'Old item' }]));
    localStorage.setItem('cachedRecommendations', JSON.stringify(['old']));

    mockNoSession();
    axios.post.mockResolvedValue({
      data: { token: 'newtoken', user: { _id: 'new-user', role: 'buyer' } },
    });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.login('new@example.com', 'pw', 'buyer');
    });

    expect(localStorage.getItem('basket')).toBe(null);
    expect(localStorage.getItem('cachedRecommendations')).toBe(null);
    expect(localStorage.getItem('basketOwner')).toBe('new-user');
  });

  it('keeps buyer scratch data when the same user logs in again', async () => {
    localStorage.setItem('basketOwner', 'same-user');
    localStorage.setItem('basket', JSON.stringify([{ name: 'Kept item' }]));

    mockNoSession();
    axios.post.mockResolvedValue({
      data: { token: 'tok', user: { _id: 'same-user', role: 'buyer' } },
    });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.login('same@example.com', 'pw', 'buyer');
    });

    expect(localStorage.getItem('basket')).toBe(JSON.stringify([{ name: 'Kept item' }]));
  });
});
