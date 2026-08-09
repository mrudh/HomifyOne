import { describe, it, expect } from 'vitest';
import { buildProfile } from '../../utils/buildProfile';

describe('buildProfile', () => {
  it('returns all-empty defaults when answers and plot are missing', () => {
    const profile = buildProfile(undefined, undefined);
    expect(profile.buyer_type).toBe('');
    expect(profile.preferred_style).toBe('');
    expect(profile.budget_min).toBe(0);
    expect(profile.budget_max).toBe(0);
    expect(profile.upgrade_categories).toEqual([]);
    expect(profile.priorities).toEqual([]);
  });

  it('maps a known style key to its display value', () => {
    const profile = buildProfile({ style: 'scandi' }, null);
    expect(profile.preferred_style).toBe('scandi');
  });

  it('maps an unrecognised style to an empty string instead of throwing', () => {
    const profile = buildProfile({ style: 'not_a_real_style' }, null);
    expect(profile.preferred_style).toBe('');
  });

  it('maps budget tiers to the correct [min, max] range', () => {
    expect(buildProfile({ budget: 'low' }, null)).toMatchObject({ budget_min: 0, budget_max: 1000 });
    expect(buildProfile({ budget: 'invest' }, null)).toMatchObject({ budget_min: 0, budget_max: 7500 });
    expect(buildProfile({ budget: 'unsure' }, null)).toMatchObject({ budget_min: 0, budget_max: 0 });
  });

  it('falls back to [0, 0] for an unknown budget key', () => {
    const profile = buildProfile({ budget: 'bogus' }, null);
    expect(profile.budget_min).toBe(0);
    expect(profile.budget_max).toBe(0);
  });

  it('flags sustainability_interest only when "eco" is in lifestyleTraits', () => {
    expect(buildProfile({ lifestyleTraits: ['eco', 'security'] }, null).sustainability_interest).toBe('eco and sustainability');
    expect(buildProfile({ lifestyleTraits: ['security'] }, null).sustainability_interest).toBe('');
    expect(buildProfile({}, null).sustainability_interest).toBe('');
  });

  it('flags smart_home_need only when "smart_home" is in lifestyleTraits', () => {
    expect(buildProfile({ lifestyleTraits: ['smart_home'] }, null).smart_home_need).toBe('smart home');
    expect(buildProfile({ lifestyleTraits: [] }, null).smart_home_need).toBe('');
  });

  it('pulls per-room answers out of roomDetails by exact key', () => {
    const profile = buildProfile({
      roomDetails: {
        'Storage & wardrobes': 'More storage',
        'Kitchen': 'Family-friendly layout',
        'Bathroom': 'Easy maintenance',
        'Flooring throughout': 'Durable',
        'Garden / outdoor space': 'Low-maintenance',
      },
    }, null);
    expect(profile.wardrobe_need).toBe('More storage');
    expect(profile.kitchen_usage).toBe('Family-friendly layout');
    expect(profile.bathroom_priority).toBe('Easy maintenance');
    expect(profile.flooring_area).toBe('Durable');
    expect(profile.garden_priority).toBe('Low-maintenance');
  });

  it('passes through household, priorities and upgrade categories unchanged', () => {
    const profile = buildProfile({
      household: 'family_y',
      lifestyleTraits: ['eco', 'security'],
      priorities: ['durable', 'safety'],
      primaryRoom: 'Kitchen',
      buyerProfile: 'Some free-text summary',
    }, null);
    expect(profile.buyer_type).toBe('family_y');
    expect(profile.household_size).toBe('family_y');
    expect(profile.bedroom_users).toBe('family_y');
    expect(profile.upgrade_categories).toEqual(['eco', 'security']);
    expect(profile.priorities).toEqual(['durable', 'safety']);
    expect(profile.home_area).toBe('Kitchen');
    expect(profile.additional_notes).toBe('Some free-text summary');
  });

  it('always reports the build stage as handover-ready regardless of input', () => {
    expect(buildProfile({}, null).build_stage).toBe('Handover / ready to move in');
  });
});
