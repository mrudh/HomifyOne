import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PlotFilterDropdown from '../../components/PlotFilterDropdown';

const plots = [
  { _id: 'plot1', plotNumber: '12', development: 'Oakfield', buyer: { name: 'J. Smith' } },
  { _id: 'plot2', plotNumber: '13', development: 'Oakfield', buyer: null },
];

describe('PlotFilterDropdown', () => {
  it('shows "All Plots" with no badge when nothing is selected', () => {
    render(<PlotFilterDropdown plots={plots} selected={[]} onChange={() => {}} />);
    expect(screen.getByText('All Plots')).toBeInTheDocument();
    expect(screen.queryByText('1')).not.toBeInTheDocument();
  });

  it('opens the popover and lists plot options on click', async () => {
    const user = userEvent.setup();
    render(<PlotFilterDropdown plots={plots} selected={[]} onChange={() => {}} />);

    expect(screen.queryByText(/Plot 12 - Oakfield/)).not.toBeInTheDocument();

    await user.click(screen.getByText('All Plots'));

    expect(screen.getByText(/Plot 12 - Oakfield/)).toBeInTheDocument();
    expect(screen.getByText(/Plot 13 - Oakfield/)).toBeInTheDocument();
  });

  it('calls onChange with the plot id when a checkbox is toggled on', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PlotFilterDropdown plots={plots} selected={[]} onChange={onChange} />);

    await user.click(screen.getByText('All Plots'));
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]);

    expect(onChange).toHaveBeenCalledWith(['plot1']);
  });

  it('calls onChange with the id removed when an already-selected checkbox is toggled off', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PlotFilterDropdown plots={plots} selected={['plot1', 'plot2']} onChange={onChange} />);

    await user.click(screen.getByText('All Plots'));
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]);

    expect(onChange).toHaveBeenCalledWith(['plot2']);
  });

  it('clears all filters when "Clear filters" is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PlotFilterDropdown plots={plots} selected={['plot1', 'plot2']} onChange={onChange} />);

    await user.click(screen.getByText('All Plots'));
    await user.click(screen.getByText('Clear filters (show all)'));

    expect(onChange).toHaveBeenCalledWith([]);
  });
});
