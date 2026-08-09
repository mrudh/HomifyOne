import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WhyAccordion from '../../components/WhyAccordion';

describe('WhyAccordion', () => {
  it('renders nothing when there are no points', () => {
    const { container } = render(<WhyAccordion points={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when points is undefined', () => {
    const { container } = render(<WhyAccordion />);
    expect(container).toBeEmptyDOMElement();
  });

  it('is visually collapsed by default and expands on click', async () => {
    const user = userEvent.setup();
    const { container } = render(<WhyAccordion points={['Matches your style', 'Fits your budget']} />);

    const contentWrapper = container.querySelector('.transition-all');
    expect(contentWrapper.className).toMatch(/max-h-0/);
    expect(contentWrapper.className).not.toMatch(/max-h-96/);

    await user.click(screen.getByText('Why we recommend this for you'));

    expect(contentWrapper.className).toMatch(/max-h-96/);
    expect(contentWrapper.className).not.toMatch(/max-h-0/);
  });

  it('toggles back to collapsed on a second click', async () => {
    const user = userEvent.setup();
    const { container } = render(<WhyAccordion points={['Matches your style']} />);
    const toggle = screen.getByText('Why we recommend this for you');
    const contentWrapper = container.querySelector('.transition-all');

    await user.click(toggle);
    expect(contentWrapper.className).toMatch(/max-h-96/);

    await user.click(toggle);
    expect(contentWrapper.className).toMatch(/max-h-0/);
  });

  it('respects defaultOpen=true', () => {
    render(<WhyAccordion points={['Point A']} defaultOpen />);
    expect(screen.getByText('Point A')).toBeInTheDocument();
  });

  it('renders every provided point as a list item', () => {
    const points = ['One', 'Two', 'Three'];
    render(<WhyAccordion points={points} defaultOpen />);
    points.forEach((p) => expect(screen.getByText(p)).toBeInTheDocument());
  });
});
