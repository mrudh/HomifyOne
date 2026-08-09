import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InvoicePreviewModal from '../../components/InvoicePreviewModal';

describe('InvoicePreviewModal', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing when closed', () => {
    const { container } = render(
      <InvoicePreviewModal open={false} onClose={() => {}} fileUrl="x.pdf" fileName="x.pdf" />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a PDF preview in an iframe for .pdf files', () => {
    render(<InvoicePreviewModal open onClose={() => {}} fileUrl="/files/invoice.pdf" fileName="invoice.pdf" />);
    const iframe = screen.getByTitle('invoice.pdf');
    expect(iframe.tagName).toBe('IFRAME');
    expect(iframe).toHaveAttribute('src', '/files/invoice.pdf');
  });

  it('renders an <img> preview for image files', () => {
    render(<InvoicePreviewModal open onClose={() => {}} fileUrl="/files/receipt.png" fileName="receipt.png" />);
    const img = screen.getByAltText('receipt.png');
    expect(img).toHaveAttribute('src', '/files/receipt.png');
  });

  it('shows a fallback message for unsupported file types', () => {
    render(<InvoicePreviewModal open onClose={() => {}} fileUrl="/files/data.csv" fileName="data.csv" />);
    expect(screen.getByText('Preview not available for this file type.')).toBeInTheDocument();
    expect(screen.getByText('Download instead')).toBeInTheDocument();
  });

  it('calls onClose when the backdrop is clicked but not when the panel itself is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <InvoicePreviewModal open onClose={onClose} fileUrl="/files/invoice.pdf" fileName="invoice.pdf" />
    );

    await user.click(screen.getByText('invoice.pdf'));
    expect(onClose).not.toHaveBeenCalled();

    await user.click(container.firstChild);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<InvoicePreviewModal open onClose={onClose} fileUrl="/files/invoice.pdf" fileName="invoice.pdf" />);
    await user.click(screen.getByLabelText('Close preview'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the Escape key is pressed', () => {
    const onClose = vi.fn();
    render(<InvoicePreviewModal open onClose={onClose} fileUrl="/files/invoice.pdf" fileName="invoice.pdf" />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
