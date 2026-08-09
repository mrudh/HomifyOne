import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import BasketPage from '../../../pages/buyer/BasketPage';
import api from '../../../services/api';
import { useBasket } from '../../../context/BasketContext';

vi.mock('../../../services/api', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));
vi.mock('../../../context/BasketContext', () => ({
  useBasket: vi.fn(),
}));

const basePlot = { _id: 'plot1', plotNumber: '12', development: 'Oakfield', status: 'assigned' };

function mockBasket(overrides = {}) {
  useBasket.mockReturnValue({
    items: [],
    removeItem: vi.fn(),
    clearBasket: vi.fn(),
    subtotal: 0,
    remaining: 0,
    overBudget: false,
    usedPct: 0,
    allowance: 0,
    setAllowance: vi.fn(),
    credit: 0,
    reward: null,
    redeemReward: vi.fn(),
    promo: null,
    applyPromo: vi.fn(),
    removePromo: vi.fn(),
    discountAmount: 0,
    finalTotal: 0,
    refreshOrderSnapshot: vi.fn(),
    cumulativeTotal: 0,
    ...overrides,
  });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <BasketPage />
    </MemoryRouter>
  );
}

describe('BasketPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url === '/selections/pending') return Promise.resolve({ data: { selections: [] } });
      if (url === '/plots/my') return Promise.resolve({ data: { plot: basePlot } });
      return Promise.resolve({ data: {} });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the empty-basket state when there are no extras or standard selections', async () => {
    mockBasket();
    renderPage();
    expect(await screen.findByText('Your basket is empty')).toBeInTheDocument();
  });

  it('lists extras with their price and lets the user remove one', async () => {
    const removeItem = vi.fn();
    mockBasket({
      items: [{ name: 'Smart Thermostat', category: 'Kitchen', price: 250 }],
      subtotal: 250,
      finalTotal: 250,
      removeItem,
    });
    const user = userEvent.setup();
    renderPage();

    const itemName = await screen.findByText('Smart Thermostat');
    const itemRow = itemName.closest('div.flex');
    expect(within(itemRow).getByText('£250')).toBeInTheDocument();

    await user.click(within(itemRow).getByText('×'));
    expect(removeItem).toHaveBeenCalledWith('Smart Thermostat');
  });

  it('shows an over-budget warning when overBudget is true', async () => {
    mockBasket({
      items: [{ name: 'Big Extra', category: 'Kitchen', price: 6000 }],
      subtotal: 6000,
      finalTotal: 6000,
      allowance: 5000,
      cumulativeTotal: 6000,
      remaining: -1000,
      overBudget: true,
      usedPct: 100,
    });
    renderPage();

    expect(await screen.findByText(/over your allowance/i)).toBeInTheDocument();
  });

  it('submits selections only after the user confirms, and posts the expected pricing payload', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    api.post.mockResolvedValue({ data: {} });
    mockBasket({
      items: [{ name: 'Smart Thermostat', category: 'Kitchen', price: 250 }],
      subtotal: 250,
      finalTotal: 250,
    });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Smart Thermostat');
    await user.click(screen.getByRole('button', { name: /submit selections for approval/i }));

    expect(confirmSpy).toHaveBeenCalled();
    expect(api.post).toHaveBeenCalledWith('/selections/submit', expect.objectContaining({
      pricing: expect.objectContaining({ subtotal: 250, finalTotal: 250 }),
      items: expect.arrayContaining([
        expect.objectContaining({ name: 'Smart Thermostat', type: 'extra', price: 250 }),
      ]),
    }));
  });

  it('does not submit when the user cancels the confirmation dialog', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    mockBasket({
      items: [{ name: 'Smart Thermostat', category: 'Kitchen', price: 250 }],
      subtotal: 250,
      finalTotal: 250,
    });
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Smart Thermostat');
    await user.click(screen.getByRole('button', { name: /submit selections for approval/i }));

    expect(api.post).not.toHaveBeenCalled();
  });

  it('shows a "pending review" notice instead of the basket when selections were already submitted', async () => {
    api.get.mockImplementation((url) => {
      if (url === '/selections/pending') return Promise.resolve({ data: { selections: [] } });
      if (url === '/plots/my') return Promise.resolve({ data: { plot: { ...basePlot, status: 'selections_submitted' } } });
      return Promise.resolve({ data: {} });
    });
    mockBasket();
    renderPage();

    expect(await screen.findByText(/selections already submitted/i)).toBeInTheDocument();
  });
});
