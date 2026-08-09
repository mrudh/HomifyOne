import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { daysAgo, daysUntil } from '../../../pages/dashboards/SupplierDashboard';

describe('daysAgo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-08T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 0 for a date earlier today', () => {
    expect(daysAgo('2026-08-08T09:00:00Z')).toBe(0);
  });

  it('returns 3 for a date 3 days ago', () => {
    expect(daysAgo('2026-08-05T12:00:00Z')).toBe(3);
  });

  it('returns 10 for a date 10 days ago', () => {
    expect(daysAgo('2026-07-29T12:00:00Z')).toBe(10);
  });
});

describe('daysUntil', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-08T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns a positive count for a future date', () => {
    expect(daysUntil('2026-08-13T12:00:00Z')).toBe(5);
  });

  it('returns 0 for today', () => {
    expect(daysUntil('2026-08-08T12:00:00Z')).toBe(0);
  });

  it('returns a negative count for an overdue (past) date', () => {
    expect(daysUntil('2026-08-03T12:00:00Z')).toBe(-5);
  });
});
