import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { AuthProvider } from '../../context/AuthContext';
import { AppProvider, useApp } from '../../context/AppContext';
import { server } from './mswServer';
import { API } from './handlers';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function Wrapper({ children }) {
  return (
    <AuthProvider>
      <AppProvider>{children}</AppProvider>
    </AuthProvider>
  );
}

function mockLoggedInBuyer() {
  server.use(
    http.get(`${API}/auth/me`, () =>
      HttpResponse.json({ success: true, user: { _id: 'u1', name: 'Jane', role: 'buyer' } })
    )
  );
}

describe('AppContext (integration)', () => {
  it('fetches the real plot for a real logged-in buyer once AuthContext resolves', async () => {
    mockLoggedInBuyer();
    server.use(
      http.get(`${API}/plots/my`, () =>
        HttpResponse.json({ success: true, plot: { _id: 'p1', plotNumber: '12' } })
      )
    );

    const { result } = renderHook(() => useApp(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.plotLoading).toBe(false));
    await waitFor(() => expect(result.current.selectedPlot).toEqual({ _id: 'p1', plotNumber: '12' }));
  });

  it('skips the plot fetch for a guest (no real user resolved)', async () => {
    // Default handler resolves /auth/me to no user
    const { result } = renderHook(() => useApp(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.plotLoading).toBe(false));
    expect(result.current.selectedPlot).toBe(null);
  });

  it('sends the real profile over the network and populates results from the real response', async () => {
    mockLoggedInBuyer();
    let capturedBody;
    server.use(
      http.post(`${API}/recommendations`, async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ recommendations: [{ name: 'Real Sofa' }] });
      })
    );

    const { result } = renderHook(() => useApp(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.plotLoading).toBe(false));

    act(() => {
      result.current.updateProfile({ household: 'Family of four' });
    });

    act(() => {
      result.current.fetchRecommendations();
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.recommendations).toEqual([{ name: 'Real Sofa' }]);
    expect(result.current.error).toBe(null);
    expect(capturedBody.profile.household).toBe('Family of four');
  });

  it('surfaces the real server error message when the recommendations request fails', async () => {
    mockLoggedInBuyer();
    server.use(
      http.post(`${API}/recommendations`, () =>
        HttpResponse.json({ success: false, message: 'Recommendation engine unavailable.' }, { status: 502 })
      )
    );

    const { result } = renderHook(() => useApp(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.plotLoading).toBe(false));

    act(() => {
      result.current.fetchRecommendations();
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Recommendation engine unavailable.');
    expect(result.current.recommendations).toEqual([]);
  });
});
