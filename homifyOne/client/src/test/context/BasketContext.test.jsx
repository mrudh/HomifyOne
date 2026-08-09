import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { BasketProvider, useBasket } from '../../context/BasketContext';
import api from '../../services/api';

vi.mock('../../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

const mockUser = { _id: 'buyer1', role: 'buyer' };
const mockPlot = { _id: 'plot1', extrasAllowance: 5000 };

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock('../../context/AppContext', () => ({
  useApp: () => ({ selectedPlot: mockPlot }),
}));

async function renderBasket() {
  api.get.mockImplementation((url) => {
    if (url === '/selections/order') return Promise.resolve({ data: { order: null } });
    if (url === '/selections/approved-spend') return Promise.resolve({ data: { approvedSpend: 0 } });
    return Promise.resolve({ data: {} });
  });
  const utils = renderHook(() => useBasket(), { wrapper: BasketProvider });
  await waitFor(() => expect(utils.result.current.orderChecked).toBe(true));
  return utils;
}

describe('BasketContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('starts empty and reports zero subtotal', async () => {
    const { result } = await renderBasket();
    expect(result.current.items).toEqual([]);
    expect(result.current.subtotal).toBe(0);
    expect(result.current.finalTotal).toBe(0);
  });

  it('addItem adds a product and recalculates subtotal; removeItem removes it', async () => {
    const { result } = await renderBasket();

    act(() => result.current.addItem({ name: 'Smart Thermostat', price: 250 }));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.subtotal).toBe(250);
    expect(result.current.isInBasket('Smart Thermostat')).toBe(true);

    act(() => result.current.addItem({ name: 'Smart Thermostat', price: 250 }));
    expect(result.current.items).toHaveLength(1);

    act(() => result.current.removeItem('Smart Thermostat'));
    expect(result.current.items).toHaveLength(0);
    expect(result.current.subtotal).toBe(0);
  });

  it('clearBasket empties items and removes the applied promo', async () => {
    const { result } = await renderBasket();
    act(() => result.current.addItem({ name: 'Item A', price: 100 }));
    act(() => result.current.applyPromo({ code: 'SAVE10', type: 'percent', discount: 10 }));

    act(() => result.current.clearBasket());
    expect(result.current.items).toEqual([]);
    expect(result.current.promo).toBe(null);
  });

  it('applies a percentage promo discount, capped by maxDiscount', async () => {
    const { result } = await renderBasket();
    act(() => result.current.addItem({ name: 'Expensive Item', price: 5000 }));
    act(() => result.current.applyPromo({ code: 'BIG20', type: 'percent', discount: 20, maxDiscount: 200 }));

    // 20% of 5000 = 1000, capped to 200
    expect(result.current.discountAmount).toBe(200);
    expect(result.current.finalTotal).toBe(5000 - 200);
  });

  it('applies a flat promo discount but never discounts more than the remaining balance', async () => {
    const { result } = await renderBasket();
    act(() => result.current.addItem({ name: 'Cheap Item', price: 50 }));
    act(() => result.current.applyPromo({ code: 'FLAT100', type: 'flat', discount: 100 }));

    expect(result.current.discountAmount).toBe(50);
    expect(result.current.finalTotal).toBe(0);
  });

  it('deducts personalisation credit before applying the promo discount', async () => {
    localStorage.setItem(
      `questionnaireReward_${mockUser._id}`,
      JSON.stringify({ credit: 100, promoCode: null })
    );
    const { result } = await renderBasket();
    act(() => result.current.addItem({ name: 'Item', price: 500 }));

    expect(result.current.credit).toBe(100);
    expect(result.current.afterCredit).toBe(400);
    expect(result.current.finalTotal).toBe(400);
  });

  it('flags overBudget once cumulative spend exceeds the allowance, and caps usedPct at 100', async () => {
    const { result } = await renderBasket();
    act(() => result.current.addItem({ name: 'Big Extra', price: 6000 }));

    expect(result.current.allowance).toBe(5000);
    expect(result.current.overBudget).toBe(true);
    expect(result.current.remaining).toBe(5000 - 6000);
    expect(result.current.usedPct).toBe(100);
  });

  it('stays within budget and reports the correct remaining allowance', async () => {
    const { result } = await renderBasket();
    act(() => result.current.addItem({ name: 'Small Extra', price: 1000 }));

    expect(result.current.overBudget).toBe(false);
    expect(result.current.remaining).toBe(4000);
    expect(result.current.usedPct).toBe(20);
  });

  it('uses the locked-in pricing from a submitted order instead of live basket totals', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/selections/order') {
        return Promise.resolve({
          data: {
            order: {
              status: 'submitted',
              pricing: { subtotal: 999, discountAmount: 50, finalTotal: 949, allowance: 5000 },
            },
          },
        });
      }
      if (url === '/selections/approved-spend') return Promise.resolve({ data: { approvedSpend: 0 } });
      return Promise.resolve({ data: {} });
    });

    const { result } = renderHook(() => useBasket(), { wrapper: BasketProvider });
    await waitFor(() => expect(result.current.hasSubmittedOrder).toBe(true));

    expect(result.current.subtotal).toBe(999);
    expect(result.current.discountAmount).toBe(50);
    expect(result.current.finalTotal).toBe(949);
  });
});
