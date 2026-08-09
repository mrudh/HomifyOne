import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CompareDrawer from '../../../pages/buyer/CompareDrawer';

const products = [
  { _id: 'p1', name: 'Standard Tap', price: 0, subCategory: 'Taps', description: 'Standard chrome finish' },
  { _id: 'p2', name: 'Premium Tap', price: 300, subCategory: 'Taps', description: 'Boiling water tap' },
];

describe('CompareDrawer', () => {
  it('renders a column for each product being compared, with the correct count in the header', () => {
    render(
      <CompareDrawer
        products={products}
        selections={{}}
        activeRoom="Kitchen"
        activeCategory="Taps"
        onSelect={() => {}}
        onClose={() => {}}
      />
    );
    expect(screen.getByText('Comparing 2 products side by side')).toBeInTheDocument();
    expect(screen.getByText('Standard Tap')).toBeInTheDocument();
    expect(screen.getByText('Premium Tap')).toBeInTheDocument();
  });

  it('labels a zero-price product "Standard" and shows "Included" pricing', () => {
    render(
      <CompareDrawer
        products={products}
        selections={{}}
        activeRoom="Kitchen"
        activeCategory="Taps"
        onSelect={() => {}}
        onClose={() => {}}
      />
    );
    expect(screen.getByText('Standard')).toBeInTheDocument();
    expect(screen.getByText('Included')).toBeInTheDocument();
    expect(screen.getByText('£300')).toBeInTheDocument();
  });

  it('marks the currently-selected product for the active room/category with "✓ Selected"', () => {
    render(
      <CompareDrawer
        products={products}
        selections={{ 'Kitchen||Taps': ['p2'] }}
        activeRoom="Kitchen"
        activeCategory="Taps"
        onSelect={() => {}}
        onClose={() => {}}
      />
    );
    expect(screen.getByRole('button', { name: /✓ selected/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^select$/i })).toBeInTheDocument();
  });

  it('calls onSelect with the product id and then onClose when a Select button is clicked', async () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <CompareDrawer
        products={products}
        selections={{}}
        activeRoom="Kitchen"
        activeCategory="Taps"
        onSelect={onSelect}
        onClose={onClose}
      />
    );

    const selectButtons = screen.getAllByRole('button', { name: /select/i });
    await user.click(selectButtons[1]);

    expect(onSelect).toHaveBeenCalledWith('p2');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the header close (✕) button is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <CompareDrawer
        products={products}
        selections={{}}
        activeRoom="Kitchen"
        activeCategory="Taps"
        onSelect={() => {}}
        onClose={onClose}
      />
    );
    await user.click(screen.getByText('✕'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
