jest.mock('../../models/Selection');
jest.mock('../../models/Plot');
jest.mock('../../models/PromoCode');
jest.mock('../../models/User');
jest.mock('../../models/Order');
jest.mock('../../models/Product');
jest.mock('../../models/PurchaseOrder');
jest.mock('../../services/calendarSync.service');
jest.mock('../../services/pdfSummary.service');
jest.mock('../../services/notification.service');

const Selection = require('../../models/Selection');
const Plot = require('../../models/Plot');
const PromoCode = require('../../models/PromoCode');
const User = require('../../models/User');
const Order = require('../../models/Order');
const Product = require('../../models/Product');
const PurchaseOrder = require('../../models/PurchaseOrder');
const { notify } = require('../../services/notification.service');
const { cancelEvent, syncPlotDeadline } = require('../../services/calendarSync.service');
const { generateSelectionSummaryPdf, getSignedSummaryUrl } = require('../../services/pdfSummary.service');
const selectionController = require('../../controllers/selection.controller');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

const basePlot = { _id: 'plot1', developer: 'dev1', plotNumber: '12' };

function baseReq(overrides = {}) {
  return {
    user: { _id: 'buyer1', name: 'Jane' },
    body: { items: [{ name: 'Cabinet', price: 500 }], pricing: { subtotal: 500, finalTotal: 500 }, ...overrides },
  };
}

describe('selection.controller submitSelections', () => {
  beforeEach(() => {
    Plot.findOne.mockResolvedValue(basePlot);
    Order.findOne.mockResolvedValue(null);
    Order.create.mockResolvedValue({ _id: 'order1' });
    Selection.updateMany.mockResolvedValue({});
    Plot.findByIdAndUpdate.mockResolvedValue({});
  });

  it('returns 404 when the buyer has no assigned plot', async () => {
    Plot.findOne.mockResolvedValue(null);
    const req = baseReq();
    const res = mockRes();
    const next = jest.fn();

    await selectionController.submitSelections(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'No plot assigned.' });
  });

  it('returns 409 when an order is already awaiting developer review', async () => {
    Order.findOne.mockResolvedValue({ _id: 'existing-order', status: 'submitted' });
    const req = baseReq();
    const res = mockRes();
    const next = jest.fn();

    await selectionController.submitSelections(req, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(Order.create).not.toHaveBeenCalled();
  });

  describe('promo code validation', () => {
    it('returns 404 when the promo code does not exist', async () => {
      PromoCode.findOne.mockResolvedValue(null);
      const req = baseReq({ promoCode: 'GHOST10' });
      const res = mockRes();
      const next = jest.fn();

      await selectionController.submitSelections(req, res, next);

      expect(PromoCode.findOne).toHaveBeenCalledWith({ code: 'GHOST10' });
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 403 when the promo code is assigned to a different buyer', async () => {
      PromoCode.findOne.mockResolvedValue({ assignedTo: 'someone-else' });
      const req = baseReq({ promoCode: 'VIP10' });
      const res = mockRes();
      const next = jest.fn();

      await selectionController.submitSelections(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('returns 409 when the promo code has already been used', async () => {
      PromoCode.findOne.mockResolvedValue({ assignedTo: 'buyer1', usedAt: new Date() });
      const req = baseReq({ promoCode: 'ONCE10' });
      const res = mockRes();
      const next = jest.fn();

      await selectionController.submitSelections(req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
    });

    it('returns 410 when the promo code has expired', async () => {
      PromoCode.findOne.mockResolvedValue({ expiresAt: new Date(Date.now() - 1000) });
      const req = baseReq({ promoCode: 'OLD10' });
      const res = mockRes();
      const next = jest.fn();

      await selectionController.submitSelections(req, res, next);

      expect(res.status).toHaveBeenCalledWith(410);
    });

    it('returns 409 for a first-order promo when the buyer already has a prior order', async () => {
      PromoCode.findOne.mockResolvedValue({ scope: 'first_order', expiresAt: null });
      Plot.exists.mockResolvedValue(true);
      const req = baseReq({ promoCode: 'WELCOME10' });
      const res = mockRes();
      const next = jest.fn();

      await selectionController.submitSelections(req, res, next);

      expect(res.status).toHaveBeenCalledWith(409);
    });

    it('marks a valid promo as used and proceeds with order creation', async () => {
      const promo = { scope: 'all_orders', expiresAt: null, save: jest.fn().mockResolvedValue(true) };
      PromoCode.findOne.mockResolvedValue(promo);
      const req = baseReq({ promoCode: 'SAVE10' });
      const res = mockRes();
      const next = jest.fn();

      await selectionController.submitSelections(req, res, next);

      expect(promo.usedAt).toBeInstanceOf(Date);
      expect(promo.save).toHaveBeenCalled();
      expect(Order.create).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalledWith(400);
    });
  });

  describe('credit application', () => {
    it('caps requested credit to the buyer\'s actual balance and adds the shortfall back onto the total', async () => {
      User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ credit: 50 }) });
      const req = baseReq({ creditApplied: 100, pricing: { subtotal: 500, finalTotal: 400 } });
      const res = mockRes();
      const next = jest.fn();

      await selectionController.submitSelections(req, res, next);

      expect(Order.create).toHaveBeenCalledWith(expect.objectContaining({
        pricing: expect.objectContaining({ credit: 50, finalTotal: 450 }),
      }));
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith('buyer1', { credit: 0 });
    });

    it('does not touch the pricing when the full requested credit is available', async () => {
      User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ credit: 200 }) });
      const req = baseReq({ creditApplied: 100, pricing: { subtotal: 500, finalTotal: 400 } });
      const res = mockRes();
      const next = jest.fn();

      await selectionController.submitSelections(req, res, next);

      expect(Order.create).toHaveBeenCalledWith(expect.objectContaining({
        pricing: { subtotal: 500, finalTotal: 400 },
      }));
      expect(User.findByIdAndUpdate).toHaveBeenCalledWith('buyer1', { credit: 0 });
    });

    it('skips the credit reset entirely when no credit is applied', async () => {
      const req = baseReq();
      const res = mockRes();
      const next = jest.fn();

      await selectionController.submitSelections(req, res, next);

      expect(User.findById).not.toHaveBeenCalled();
      expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
    });
  });

  it('creates the order, confirms selections, updates plot status and notifies the developer on success', async () => {
    const req = baseReq();
    const res = mockRes();
    const next = jest.fn();

    await selectionController.submitSelections(req, res, next);

    expect(Order.create).toHaveBeenCalledWith(expect.objectContaining({
      plot: 'plot1',
      buyer: 'buyer1',
      items: [{ name: 'Cabinet', price: 500 }],
    }));
    expect(Selection.updateMany).toHaveBeenCalledWith({ plot: 'plot1' }, { status: 'confirmed' });
    expect(Plot.findByIdAndUpdate).toHaveBeenCalledWith('plot1', { status: 'selections_submitted' });
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({
      recipient: 'dev1',
      type: 'order_submitted',
    }));
    expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Selections submitted!', orderId: 'order1' });
  });

  it('forwards unexpected errors to next()', async () => {
    Plot.findOne.mockImplementation(() => { throw new Error('DB unreachable'); });
    const req = baseReq();
    const res = mockRes();
    const next = jest.fn();

    await selectionController.submitSelections(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('selection.controller getMySelections', () => {
  it('returns 404 when the buyer has no plot', async () => {
    Plot.findOne.mockResolvedValue(null);
    const req = { user: { _id: 'buyer1' } };
    const res = mockRes();
    await selectionController.getMySelections(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns the populated selections for the buyer\'s plot', async () => {
    Plot.findOne.mockResolvedValue(basePlot);
    Selection.find.mockReturnValue({ populate: jest.fn().mockResolvedValue([{ _id: 's1' }]) });
    const req = { user: { _id: 'buyer1' } };
    const res = mockRes();
    await selectionController.getMySelections(req, res, jest.fn());

    expect(res.json).toHaveBeenCalledWith({ success: true, selections: [{ _id: 's1' }] });
  });

  it('forwards errors to next()', async () => {
    Plot.findOne.mockImplementation(() => { throw new Error('boom'); });
    const req = { user: { _id: 'buyer1' } };
    const res = mockRes();
    const next = jest.fn();
    await selectionController.getMySelections(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('selection.controller getPendingSelections', () => {
  it('returns 404 when the buyer has no plot', async () => {
    Plot.findOne.mockResolvedValue(null);
    const res = mockRes();
    await selectionController.getPendingSelections({ user: { _id: 'buyer1' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns selections that are not yet confirmed', async () => {
    Plot.findOne.mockResolvedValue(basePlot);
    Selection.find.mockReturnValue({ populate: jest.fn().mockResolvedValue([{ _id: 's2' }]) });
    const res = mockRes();
    await selectionController.getPendingSelections({ user: { _id: 'buyer1' } }, res, jest.fn());

    expect(Selection.find).toHaveBeenCalledWith({ plot: 'plot1', status: { $ne: 'confirmed' } });
    expect(res.json).toHaveBeenCalledWith({ success: true, selections: [{ _id: 's2' }] });
  });
});

describe('selection.controller getApprovedSpend', () => {
  it('returns 404 when the buyer has no plot', async () => {
    Plot.findOne.mockResolvedValue(null);
    const res = mockRes();
    await selectionController.getApprovedSpend({ user: { _id: 'buyer1' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('sums the finalTotal of all approved orders for the plot', async () => {
    Plot.findOne.mockResolvedValue(basePlot);
    Order.find.mockResolvedValue([
      { pricing: { finalTotal: 500 } },
      { pricing: { finalTotal: 250 } },
      { pricing: {} },
    ]);
    const res = mockRes();
    await selectionController.getApprovedSpend({ user: { _id: 'buyer1' } }, res, jest.fn());

    expect(res.json).toHaveBeenCalledWith({ success: true, approvedSpend: 750 });
  });
});

describe('selection.controller saveSelection', () => {
  it('returns 404 when the buyer has no plot', async () => {
    Plot.findOne.mockResolvedValue(null);
    const res = mockRes();
    await selectionController.saveSelection({ user: { _id: 'buyer1' }, body: {} }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('creates a new selection and adds a product when none exists yet', async () => {
    Plot.findOne.mockResolvedValue(basePlot);
    Selection.findOne.mockResolvedValue(null);
    const saved = { products: [], save: jest.fn().mockResolvedValue(true), populate: jest.fn().mockResolvedValue(true) };
    Selection.mockImplementation(() => saved);
    const req = { user: { _id: 'buyer1' }, body: { room: 'Kitchen', category: 'Worktops', productId: 'p1', action: 'add' } };
    const res = mockRes();
    await selectionController.saveSelection(req, res, jest.fn());

    expect(saved.products).toContain('p1');
    expect(saved.save).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ success: true, selection: saved });
  });

  it('does not duplicate a product already selected', async () => {
    Plot.findOne.mockResolvedValue(basePlot);
    const existing = { products: ['p1'], save: jest.fn().mockResolvedValue(true), populate: jest.fn().mockResolvedValue(true) };
    Selection.findOne.mockResolvedValue(existing);
    const req = { user: { _id: 'buyer1' }, body: { room: 'Kitchen', category: 'Worktops', productId: 'p1', action: 'add' } };
    const res = mockRes();
    await selectionController.saveSelection(req, res, jest.fn());

    expect(existing.products).toEqual(['p1']);
  });

  it('removes a product from an existing selection', async () => {
    Plot.findOne.mockResolvedValue(basePlot);
    const existing = { products: ['p1', 'p2'], save: jest.fn().mockResolvedValue(true), populate: jest.fn().mockResolvedValue(true) };
    Selection.findOne.mockResolvedValue(existing);
    const req = { user: { _id: 'buyer1' }, body: { room: 'Kitchen', category: 'Worktops', productId: 'p1', action: 'remove' } };
    const res = mockRes();
    await selectionController.saveSelection(req, res, jest.fn());

    expect(existing.products).toEqual(['p2']);
  });
});

describe('selection.controller order read endpoints', () => {
  it('getMyOrder returns 404 when there is no order', async () => {
    Order.findOne.mockReturnValue({ sort: jest.fn().mockResolvedValue(null) });
    const res = mockRes();
    await selectionController.getMyOrder({ user: { _id: 'buyer1' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('getMyOrder returns the most recent order', async () => {
    Order.findOne.mockReturnValue({ sort: jest.fn().mockResolvedValue({ _id: 'o1' }) });
    const res = mockRes();
    await selectionController.getMyOrder({ user: { _id: 'buyer1' } }, res, jest.fn());
    expect(res.json).toHaveBeenCalledWith({ success: true, order: { _id: 'o1' } });
  });

  it('getMyOrders returns all orders for the buyer', async () => {
    Order.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([{ _id: 'o1' }, { _id: 'o2' }]) });
    const res = mockRes();
    await selectionController.getMyOrders({ user: { _id: 'buyer1' } }, res, jest.fn());
    expect(res.json).toHaveBeenCalledWith({ success: true, orders: [{ _id: 'o1' }, { _id: 'o2' }] });
  });

  it('getOrderById returns 404 when the order does not belong to the buyer', async () => {
    Order.findOne.mockResolvedValue(null);
    const res = mockRes();
    await selectionController.getOrderById({ user: { _id: 'buyer1' }, params: { id: 'o1' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('getOrderById returns the order when it belongs to the buyer', async () => {
    Order.findOne.mockResolvedValue({ _id: 'o1' });
    const res = mockRes();
    await selectionController.getOrderById({ user: { _id: 'buyer1' }, params: { id: 'o1' } }, res, jest.fn());
    expect(res.json).toHaveBeenCalledWith({ success: true, order: { _id: 'o1' } });
  });
});

describe('selection.controller developer order views', () => {
  it('getDeveloperOrders returns orders across all of the developer\'s plots', async () => {
    Plot.find.mockReturnValue({ select: jest.fn().mockResolvedValue([{ _id: 'plot1' }, { _id: 'plot2' }]) });
    const chain = { populate: jest.fn(), sort: jest.fn() };
    chain.populate.mockReturnValue(chain);
    chain.sort.mockResolvedValue([{ _id: 'o1' }]);
    Order.find.mockReturnValue(chain);

    const res = mockRes();
    await selectionController.getDeveloperOrders({ user: { _id: 'dev1' } }, res, jest.fn());

    expect(res.json).toHaveBeenCalledWith({ success: true, orders: [{ _id: 'o1' }] });
  });

  it('getDeveloperApprovedSummaries groups approved orders by plot', async () => {
    Plot.find.mockReturnValue({ select: jest.fn().mockResolvedValue([{ _id: 'plot1', plotNumber: '5' }]) });
    const chain = { populate: jest.fn(), sort: jest.fn() };
    chain.populate.mockReturnValue(chain);
    chain.sort.mockResolvedValue([
      { _id: 'o1', plot: { _id: 'plot1', plotNumber: '5' } },
      { _id: 'o2', plot: { _id: 'plot1', plotNumber: '5' } },
    ]);
    Order.find.mockReturnValue(chain);

    const res = mockRes();
    await selectionController.getDeveloperApprovedSummaries({ user: { _id: 'dev1' } }, res, jest.fn());

    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.groups).toHaveLength(1);
    expect(payload.groups[0].orders).toHaveLength(2);
  });
});

describe('selection.controller approveOrder', () => {
  function approvableOrder(overrides = {}) {
    return {
      _id: 'order1',
      plot: { _id: 'plot1', developer: 'dev1', plotNumber: '5' },
      buyer: { _id: 'buyer1' },
      items: [{ name: 'Cabinet', price: 500, category: 'Cabinets' }],
      toObject: jest.fn().mockReturnValue({ _id: 'order1', items: [{ name: 'Cabinet', price: 500 }] }),
      save: jest.fn().mockResolvedValue(true),
      ...overrides,
    };
  }

  beforeEach(() => {
    generateSelectionSummaryPdf.mockResolvedValue('https://x/summary.pdf');
    cancelEvent.mockResolvedValue(true);
    Plot.findByIdAndUpdate.mockResolvedValue({});
  });

  it('returns 404 when the order does not exist', async () => {
    Order.findById.mockReturnValue({ populate: jest.fn().mockReturnThis() });
    Order.findById().populate.mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });
    const res = mockRes();
    await selectionController.approveOrder({ user: { _id: 'dev1' }, params: { id: 'order1' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 403 when the requesting developer does not own the plot', async () => {
    const order = approvableOrder({ plot: { _id: 'plot1', developer: 'someone-else', plotNumber: '5' } });
    Order.findById.mockReturnValue({ populate: jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(order) }) });
    const res = mockRes();
    await selectionController.approveOrder({ user: { _id: 'dev1' }, params: { id: 'order1' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('approves the order, generates purchase orders grouped by supplier, and notifies buyer + suppliers', async () => {
    const order = approvableOrder();
    Order.findById.mockReturnValue({ populate: jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(order) }) });
    Product.find.mockResolvedValue([{ _id: 'prod1', name: 'Cabinet', supplier: 'supplier1' }]);
    PurchaseOrder.create.mockResolvedValue({ _id: 'po1', supplier: 'supplier1', totalCost: 500 });

    const res = mockRes();
    await selectionController.approveOrder({ user: { _id: 'dev1', name: 'Dev Dan' }, params: { id: 'order1' } }, res, jest.fn());

    expect(order.status).toBe('approved');
    expect(order.summaryPdf.url).toBe('https://x/summary.pdf');
    expect(PurchaseOrder.create).toHaveBeenCalledWith(expect.objectContaining({ supplier: 'supplier1', totalCost: 500 }));
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ recipient: 'buyer1', type: 'order_approved' }));
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ recipient: 'supplier1', type: 'purchase_order_created' }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, unmatchedItems: [] }));
  });

  it('reports items with no matching product as unmatched, without creating a purchase order for them', async () => {
    const order = approvableOrder({ items: [{ name: 'Unknown Item', price: 100, category: 'Misc' }] });
    Order.findById.mockReturnValue({ populate: jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(order) }) });
    Product.find.mockResolvedValue([]);

    const res = mockRes();
    await selectionController.approveOrder({ user: { _id: 'dev1', name: 'Dev Dan' }, params: { id: 'order1' } }, res, jest.fn());

    expect(PurchaseOrder.create).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ unmatchedItems: ['Unknown Item'] }));
  });
});

describe('selection.controller rejectOrder', () => {
  it('returns 400 when no reason is given', async () => {
    const res = mockRes();
    await selectionController.rejectOrder({ user: { _id: 'dev1' }, params: { id: 'order1' }, body: {} }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 404 when the order does not exist', async () => {
    Order.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });
    const res = mockRes();
    await selectionController.rejectOrder({ user: { _id: 'dev1' }, params: { id: 'order1' }, body: { reason: 'Too expensive' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 403 when the developer does not own the plot', async () => {
    Order.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue({ plot: { developer: 'someone-else' } }) });
    const res = mockRes();
    await selectionController.rejectOrder({ user: { _id: 'dev1' }, params: { id: 'order1' }, body: { reason: 'Too expensive' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('rejects the order, extends the deadline by 14 days, and notifies the buyer', async () => {
    const order = { plot: { _id: 'plot1', developer: 'dev1', plotNumber: '5' }, buyer: 'buyer1', save: jest.fn().mockResolvedValue(true), _id: 'order1' };
    Order.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(order) });
    Plot.findByIdAndUpdate.mockResolvedValue({ _id: 'plot1' });
    syncPlotDeadline.mockResolvedValue(true);

    const res = mockRes();
    await selectionController.rejectOrder({ user: { _id: 'dev1' }, params: { id: 'order1' }, body: { reason: '  Over budget  ' } }, res, jest.fn());

    expect(order.status).toBe('rejected');
    expect(order.rejectionReason).toBe('Over budget');
    expect(Plot.findByIdAndUpdate).toHaveBeenCalledWith('plot1', expect.objectContaining({ status: 'selections_rejected', rejectionReason: 'Over budget' }), { new: true });
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ recipient: 'buyer1', type: 'order_rejected' }));
    expect(res.json).toHaveBeenCalledWith({ success: true, order });
  });
});

describe('selection.controller getOrderSummaryPdf', () => {
  it('returns 404 when the order does not exist', async () => {
    Order.findById.mockResolvedValue(null);
    const res = mockRes();
    await selectionController.getOrderSummaryPdf({ user: { _id: 'buyer1' }, params: { id: 'order1' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 403 when the requester is neither the buyer nor the plot developer', async () => {
    Order.findById.mockResolvedValue({ _id: 'order1', buyer: 'someone-else', plot: 'plot1' });
    Plot.findById.mockResolvedValue({ developer: 'another-dev' });
    const res = mockRes();
    await selectionController.getOrderSummaryPdf({ user: { _id: 'buyer1' }, params: { id: 'order1' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 404 when the summary has not been generated yet', async () => {
    Order.findById.mockResolvedValue({ _id: 'order1', buyer: 'buyer1', plot: 'plot1', summaryPdf: null });
    Plot.findById.mockResolvedValue({ developer: 'dev1' });
    const res = mockRes();
    await selectionController.getOrderSummaryPdf({ user: { _id: 'buyer1' }, params: { id: 'order1' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('redirects to a freshly signed URL for the owner', async () => {
    Order.findById.mockResolvedValue({ _id: 'order1', buyer: 'buyer1', plot: 'plot1', summaryPdf: { generatedAt: new Date() } });
    Plot.findById.mockResolvedValue({ developer: 'dev1' });
    getSignedSummaryUrl.mockResolvedValue('https://x/signed.pdf');
    const res = { redirect: jest.fn() };
    await selectionController.getOrderSummaryPdf({ user: { _id: 'buyer1' }, params: { id: 'order1' } }, res, jest.fn());
    expect(res.redirect).toHaveBeenCalledWith('https://x/signed.pdf');
  });
});

describe('selection.controller regenerateSummaryPdf', () => {
  it('returns 404 when the order does not exist', async () => {
    Order.findById.mockReturnValue({ populate: jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(null) }) });
    const res = mockRes();
    await selectionController.regenerateSummaryPdf({ user: { _id: 'dev1' }, params: { id: 'order1' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 403 for a developer who does not own the plot', async () => {
    const order = { plot: { developer: 'someone-else' } };
    Order.findById.mockReturnValue({ populate: jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(order) }) });
    const res = mockRes();
    await selectionController.regenerateSummaryPdf({ user: { _id: 'dev1' }, params: { id: 'order1' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('regenerates and saves a fresh summary PDF', async () => {
    const order = {
      plot: { developer: 'dev1' },
      toObject: jest.fn().mockReturnValue({ items: [] }),
      save: jest.fn().mockResolvedValue(true),
    };
    Order.findById.mockReturnValue({ populate: jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(order) }) });
    generateSelectionSummaryPdf.mockResolvedValue('https://x/new-summary.pdf');

    const res = mockRes();
    await selectionController.regenerateSummaryPdf({ user: { _id: 'dev1', name: 'Dev Dan' }, params: { id: 'order1' } }, res, jest.fn());

    expect(order.summaryPdf.url).toBe('https://x/new-summary.pdf');
    expect(order.save).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ success: true, order });
  });
});
