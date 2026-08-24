import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProductModal from '../../../pages/buyer/ProductModal';

const standardProduct = { name: 'Standard Worktop', price: 0, description: 'Included finish', tags: ['standard'] };
const upgradeProduct = { name: 'Quartz Worktop', price: 850, description: 'Premium finish', tags: ['upgrade', 'premium'] };

describe('ProductModal', () => {
  it('labels a zero-price product as "Standard - Included" with no price shown', () => {
    render(<ProductModal product={standardProduct} isSelected={false} onSelect={() => {}} onClose={() => {}} />);
    expect(screen.getByText('Standard - Included')).toBeInTheDocument();
    expect(screen.queryByText(/^\+ £/)).not.toBeInTheDocument();
  });

  it('labels a priced product as "Upgrade" and shows its price', () => {
    render(<ProductModal product={upgradeProduct} isSelected={false} onSelect={() => {}} onClose={() => {}} />);
    expect(screen.getByText('Upgrade')).toBeInTheDocument();
    expect(screen.getByText('+ £850')).toBeInTheDocument();
  });

  it('shows "✓ Selected" as the button label when isSelected is true', () => {
    render(<ProductModal product={upgradeProduct} isSelected onSelect={() => {}} onClose={() => {}} />);
    expect(screen.getByRole('button', { name: /✓ selected/i })).toBeInTheDocument();
  });

  it('calls onSelect when the select button is clicked', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<ProductModal product={upgradeProduct} isSelected={false} onSelect={onSelect} onClose={() => {}} />);
    await user.click(screen.getByRole('button', { name: /select this option/i }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when clicking the backdrop, and not when clicking inside the panel', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <ProductModal product={upgradeProduct} isSelected={false} onSelect={() => {}} onClose={onClose} />
    );

    await user.click(screen.getByText('Quartz Worktop'));
    expect(onClose).not.toHaveBeenCalled();

    await user.click(container.firstChild);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders each tag provided on the product', () => {
    render(<ProductModal product={upgradeProduct} isSelected={false} onSelect={() => {}} onClose={() => {}} />);
    expect(screen.getByText('upgrade')).toBeInTheDocument();
    expect(screen.getByText('premium')).toBeInTheDocument();
  });
});
