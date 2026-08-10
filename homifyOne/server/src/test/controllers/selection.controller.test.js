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
const { notify } = require('../../services/notification.service');
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
