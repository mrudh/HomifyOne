import { describe, it, expect, beforeAll, afterEach, afterAll, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import { server } from './mswServer';
import { API } from './handlers';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

beforeEach(() => {
  localStorage.clear();
});

describe('AuthContext (integration)', () => {
  it('resolves to no user when the real /auth/me call returns no session', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBe(null);
  });

  it('logs in over a real network round trip and stores the real response', async () => {
    server.use(
      http.post(`${API}/auth/login`, () =>
        HttpResponse.json({
          success: true,
          token: 'real-round-trip-token',
          user: { _id: 'u1', name: 'Jane', role: 'buyer' },
        })
      )
    );

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let returnedUser;
    await act(async () => {
      returnedUser = await result.current.login('jane@gmail.com', 'correct-password', 'buyer');
    });

    expect(returnedUser).toEqual({ _id: 'u1', name: 'Jane', role: 'buyer' });
    expect(result.current.user).toEqual({ _id: 'u1', name: 'Jane', role: 'buyer' });
    expect(result.current.token).toBe('real-round-trip-token');
    expect(localStorage.getItem('token')).toBe('real-round-trip-token');
  });

  it('rejects and leaves state untouched when the real server returns 401', async () => {
    server.use(
      http.post(`${API}/auth/login`, () =>
        HttpResponse.json({ success: false, message: 'Invalid email, password, or role.' }, { status: 401 })
      )
    );

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(
      act(async () => {
        await result.current.login('jane@gmail.com', 'wrong-password', 'buyer');
      })
    ).rejects.toBeTruthy();

    expect(result.current.user).toBe(null);
    expect(localStorage.getItem('token')).toBe(null);
  });

  it('logs out over a real network round trip and clears local state', async () => {
    server.use(
      http.post(`${API}/auth/login`, () =>
        HttpResponse.json({ success: true, token: 'tok', user: { _id: 'u1', role: 'buyer' } })
      )
    );

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.login('jane@gmail.com', 'correct-password', 'buyer');
    });
    expect(result.current.user).not.toBe(null);

    let logoutCalled = false;
    server.use(
      http.post(`${API}/auth/logout`, () => {
        logoutCalled = true;
        return HttpResponse.json({ success: true });
      })
    );

    await act(async () => {
      await result.current.logout();
    });

    expect(logoutCalled).toBe(true);
    expect(result.current.user).toBe(null);
    expect(result.current.token).toBe(null);
    expect(localStorage.getItem('token')).toBe(null);
  });
});
