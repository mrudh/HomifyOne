import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { AppProvider, useApp } from '../../context/AppContext';
import api from '../../services/api';

vi.mock('../../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { _id: 'u1', role: 'buyer' } }),
}));

describe('AppContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: { plot: null } });
  });

  it('updateProfile merges a patch into the existing profile without dropping other fields', async () => {
    const { result } = renderHook(() => useApp(), { wrapper: AppProvider });
    await waitFor(() => expect(result.current.plotLoading).toBe(false));

    act(() => result.current.updateProfile({ household: 'couple' }));
    expect(result.current.profile.household).toBe('couple');

    act(() => result.current.updateProfile({ preferred_style: 'modern' }));
    expect(result.current.profile.household).toBe('couple');
    expect(result.current.profile.preferred_style).toBe('modern');
  });

  it('resetProfile clears the profile back to defaults and empties recommendations', async () => {
    const { result } = renderHook(() => useApp(), { wrapper: AppProvider });
    await waitFor(() => expect(result.current.plotLoading).toBe(false));

    act(() => result.current.updateProfile({ household: 'couple' }));
    act(() => result.current.setRecommendations([{ name: 'Something' }]));
    expect(result.current.profile.household).toBe('couple');

    act(() => result.current.resetProfile());
    expect(result.current.profile.household).toBe('');
    expect(result.current.recommendations).toEqual([]);
  });

  it('buildNLPSentence returns a placeholder when no profile data has been set', async () => {
    const { result } = renderHook(() => useApp(), { wrapper: AppProvider });
    await waitFor(() => expect(result.current.plotLoading).toBe(false));

    expect(result.current.buildNLPSentence()).toBe('No profile data yet.');
  });

  it('buildNLPSentence joins only the fields that are present', async () => {
    const { result } = renderHook(() => useApp(), { wrapper: AppProvider });
    await waitFor(() => expect(result.current.plotLoading).toBe(false));

    act(() => result.current.updateProfile({ household: 'Family', tech_level: 'High' }));
    expect(result.current.buildNLPSentence()).toBe('Household: Family · tech level: High');
  });

  it('buildNLPSentence omits "wfh" when it is "never"', async () => {
    const { result } = renderHook(() => useApp(), { wrapper: AppProvider });
    await waitFor(() => expect(result.current.plotLoading).toBe(false));

    act(() => result.current.updateProfile({ household: 'Solo', wfh: 'never' }));
    expect(result.current.buildNLPSentence()).toBe('Household: Solo');

    act(() => result.current.updateProfile({ wfh: 'daily' }));
    expect(result.current.buildNLPSentence()).toContain('works from home (daily)');
  });

  it('fetchRecommendations populates recommendations on success', async () => {
    api.post.mockResolvedValue({ data: { recommendations: [{ name: 'Sofa' }] } });
    const { result } = renderHook(() => useApp(), { wrapper: AppProvider });
    await waitFor(() => expect(result.current.plotLoading).toBe(false));

    act(() => {
      result.current.fetchRecommendations();
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.recommendations).toEqual([{ name: 'Sofa' }]);
    expect(result.current.error).toBe(null);
  });

  it('fetchRecommendations sets an error message on failure', async () => {
    api.post.mockRejectedValue({ response: { data: { message: 'Server exploded' } } });
    const { result } = renderHook(() => useApp(), { wrapper: AppProvider });
    await waitFor(() => expect(result.current.plotLoading).toBe(false));

    act(() => {
      result.current.fetchRecommendations();
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Server exploded');
  });

  it('fetchPlot stores the plot returned for a buyer user', async () => {
    api.get.mockResolvedValue({ data: { plot: { _id: 'p1', plotNumber: '7' } } });
    const { result } = renderHook(() => useApp(), { wrapper: AppProvider });

    await waitFor(() => expect(result.current.plotLoading).toBe(false));
    expect(result.current.selectedPlot).toEqual({ _id: 'p1', plotNumber: '7' });
  });
});
