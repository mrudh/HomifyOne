jest.mock('../../models/Plot');
jest.mock('../../models/Order');
jest.mock('../../models/PurchaseOrder');
jest.mock('../../models/Invoice');
jest.mock('../../models/Selection');
jest.mock('../../services/notification.service');

const Plot = require('../../models/Plot');
const Order = require('../../models/Order');
const PurchaseOrder = require('../../models/PurchaseOrder');
const Invoice = require('../../models/Invoice');
const Selection = require('../../models/Selection');
const { notify } = require('../../services/notification.service');
const plotController = require('../../controllers/plot.controller');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('plot.controller createPlot', () => {
  it('creates a plot owned by the requesting developer', async () => {
    Plot.create.mockResolvedValue({ _id: 'plot1', plotNumber: '7' });
    const req = { user: { _id: 'dev1' }, body: { plotNumber: '7', address: '7 Close', development: 'Oakfield' } };
    const res = mockRes();
    await plotController.createPlot(req, res, jest.fn());

    expect(Plot.create).toHaveBeenCalledWith(expect.objectContaining({ plotNumber: '7', developer: 'dev1' }));
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('forwards errors to next()', async () => {
    Plot.create.mockRejectedValue(new Error('validation failed'));
    const res = mockRes();
    const next = jest.fn();
    await plotController.createPlot({ user: { _id: 'dev1' }, body: {} }, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('plot.controller getMyPlots', () => {
  function plotDoc(overrides = {}) {
    return {
      _id: 'plot1',
      deadline: null,
      toObject: jest.fn().mockReturnValue({ _id: 'plot1', plotNumber: '5', ...overrides }),
      ...overrides,
    };
  }

  it('marks a plot with no orders as orderStatus "none" and not locked', async () => {
    Plot.find.mockReturnValue({ populate: jest.fn().mockResolvedValue([plotDoc()]) });
    Order.find
      .mockReturnValueOnce({ select: jest.fn().mockReturnValue({ sort: jest.fn().mockResolvedValue([]) }) })
      .mockReturnValueOnce({ select: jest.fn().mockResolvedValue([]) });
    Selection.find.mockReturnValue({ select: jest.fn().mockResolvedValue([]) });

    const res = mockRes();
    await plotController.getMyPlots({ user: { _id: 'dev1' } }, res, jest.fn());

    const payload = res.json.mock.calls[0][0];
    expect(payload.plots[0].orderStatus).toBe('none');
    expect(payload.plots[0].selectionsLocked).toBe(false);
  });

  it('marks orderStatus "in_progress" for a submitted order with no delivery yet', async () => {
    Plot.find.mockReturnValue({ populate: jest.fn().mockResolvedValue([plotDoc()]) });
    Order.find
      .mockReturnValueOnce({ select: jest.fn().mockReturnValue({ sort: jest.fn().mockResolvedValue([{ plot: 'plot1', deliveredAt: null }]) }) })
      .mockReturnValueOnce({ select: jest.fn().mockResolvedValue([{ plot: 'plot1' }]) });
    Selection.find.mockReturnValue({ select: jest.fn().mockResolvedValue([]) });

    const res = mockRes();
    await plotController.getMyPlots({ user: { _id: 'dev1' } }, res, jest.fn());

    expect(res.json.mock.calls[0][0].plots[0].orderStatus).toBe('in_progress');
  });

  it('marks orderStatus "delivered" once the latest order has a deliveredAt', async () => {
    Plot.find.mockReturnValue({ populate: jest.fn().mockResolvedValue([plotDoc()]) });
    Order.find
      .mockReturnValueOnce({ select: jest.fn().mockReturnValue({ sort: jest.fn().mockResolvedValue([{ plot: 'plot1', deliveredAt: new Date() }]) }) })
      .mockReturnValueOnce({ select: jest.fn().mockResolvedValue([]) });
    Selection.find.mockReturnValue({ select: jest.fn().mockResolvedValue([]) });

    const res = mockRes();
    await plotController.getMyPlots({ user: { _id: 'dev1' } }, res, jest.fn());

    expect(res.json.mock.calls[0][0].plots[0].orderStatus).toBe('delivered');
  });

  it('locks selections once the deadline has passed with no order or selection activity', async () => {
    const past = new Date(Date.now() - 86400000);
    Plot.find.mockReturnValue({ populate: jest.fn().mockResolvedValue([plotDoc({ deadline: past })]) });
    Order.find
      .mockReturnValueOnce({ select: jest.fn().mockReturnValue({ sort: jest.fn().mockResolvedValue([]) }) })
      .mockReturnValueOnce({ select: jest.fn().mockResolvedValue([]) });
    Selection.find.mockReturnValue({ select: jest.fn().mockResolvedValue([]) });

    const res = mockRes();
    await plotController.getMyPlots({ user: { _id: 'dev1' } }, res, jest.fn());

    expect(res.json.mock.calls[0][0].plots[0].selectionsLocked).toBe(true);
  });

  it('does not lock selections past deadline if the buyer already has selection activity', async () => {
    const past = new Date(Date.now() - 86400000);
    Plot.find.mockReturnValue({ populate: jest.fn().mockResolvedValue([plotDoc({ deadline: past })]) });
    Order.find
      .mockReturnValueOnce({ select: jest.fn().mockReturnValue({ sort: jest.fn().mockResolvedValue([]) }) })
      .mockReturnValueOnce({ select: jest.fn().mockResolvedValue([]) });
    Selection.find.mockReturnValue({ select: jest.fn().mockResolvedValue([{ plot: 'plot1' }]) });

    const res = mockRes();
    await plotController.getMyPlots({ user: { _id: 'dev1' } }, res, jest.fn());

    expect(res.json.mock.calls[0][0].plots[0].selectionsLocked).toBe(false);
  });
});

describe('plot.controller getMyPlot', () => {
  it('returns 404 when the buyer has no plot', async () => {
    Plot.findOne.mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });
    const res = mockRes();
    await plotController.getMyPlot({ user: { _id: 'buyer1' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('locks selections when the deadline has passed and there is no activity', async () => {
    const past = new Date(Date.now() - 86400000);
    const plot = { _id: 'plot1', deadline: past, toObject: jest.fn().mockReturnValue({ _id: 'plot1' }) };
    Plot.findOne.mockReturnValue({ populate: jest.fn().mockResolvedValue(plot) });
    Order.countDocuments.mockResolvedValue(0);
    Selection.exists.mockResolvedValue(null);

    const res = mockRes();
    await plotController.getMyPlot({ user: { _id: 'buyer1' } }, res, jest.fn());

    expect(res.json).toHaveBeenCalledWith({ success: true, plot: { _id: 'plot1', selectionsLocked: true } });
  });

  it('does not lock selections when the buyer already has an order', async () => {
    const past = new Date(Date.now() - 86400000);
    const plot = { _id: 'plot1', deadline: past, toObject: jest.fn().mockReturnValue({ _id: 'plot1' }) };
    Plot.findOne.mockReturnValue({ populate: jest.fn().mockResolvedValue(plot) });
    Order.countDocuments.mockResolvedValue(1);
    Selection.exists.mockResolvedValue(null);

    const res = mockRes();
    await plotController.getMyPlot({ user: { _id: 'buyer1' } }, res, jest.fn());

    expect(res.json).toHaveBeenCalledWith({ success: true, plot: { _id: 'plot1', selectionsLocked: false } });
  });
});

describe('plot.controller assignBuyer', () => {
  it('assigns the buyer and marks the plot as assigned', async () => {
    Plot.findByIdAndUpdate.mockResolvedValue({ _id: 'plot1', buyer: 'buyer1', status: 'assigned' });
    const res = mockRes();
    await plotController.assignBuyer({ params: { id: 'plot1' }, body: { buyerId: 'buyer1' } }, res, jest.fn());

    expect(Plot.findByIdAndUpdate).toHaveBeenCalledWith('plot1', { buyer: 'buyer1', status: 'assigned' }, { new: true });
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('plot.controller setDeadline', () => {
  it('updates the deadline for a plot owned by the developer', async () => {
    Plot.findOneAndUpdate.mockResolvedValue({ _id: 'plot1', deadline: '2026-09-01' });
    const res = mockRes();
    await plotController.setDeadline({ params: { id: 'plot1' }, user: { _id: 'dev1' }, body: { deadline: '2026-09-01' } }, res, jest.fn());

    expect(Plot.findOneAndUpdate).toHaveBeenCalledWith({ _id: 'plot1', developer: 'dev1' }, { deadline: '2026-09-01' }, { new: true });
  });
});

describe('plot.controller setAllowance', () => {
  it('returns 404 when the plot is not found for this developer', async () => {
    Plot.findOneAndUpdate.mockResolvedValue(null);
    const res = mockRes();
    await plotController.setAllowance({ params: { id: 'plot1' }, user: { _id: 'dev1' }, body: { extrasAllowance: 6000 } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('updates the allowance', async () => {
    Plot.findOneAndUpdate.mockResolvedValue({ _id: 'plot1', extrasAllowance: 6000 });
    const res = mockRes();
    await plotController.setAllowance({ params: { id: 'plot1' }, user: { _id: 'dev1' }, body: { extrasAllowance: 6000 } }, res, jest.fn());
    expect(res.json).toHaveBeenCalledWith({ success: true, plot: { _id: 'plot1', extrasAllowance: 6000 } });
  });
});

describe('plot.controller sendDeliveryUpdate', () => {
  it('returns 400 when no message is given', async () => {
    const res = mockRes();
    await plotController.sendDeliveryUpdate({ params: { id: 'plot1' }, user: { _id: 'dev1' }, body: { message: '  ' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 404 when the plot does not belong to this developer', async () => {
    Plot.findOne.mockResolvedValue(null);
    const res = mockRes();
    await plotController.sendDeliveryUpdate({ params: { id: 'plot1' }, user: { _id: 'dev1' }, body: { message: 'Update' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 400 when the plot has no buyer assigned', async () => {
    Plot.findOne.mockResolvedValue({ _id: 'plot1', buyer: null });
    const res = mockRes();
    await plotController.sendDeliveryUpdate({ params: { id: 'plot1' }, user: { _id: 'dev1' }, body: { message: 'Update' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 409 when there is no approved order yet', async () => {
    Plot.findOne.mockResolvedValue({ _id: 'plot1', buyer: 'buyer1' });
    Order.findOne.mockReturnValue({ sort: jest.fn().mockResolvedValue(null) });
    const res = mockRes();
    await plotController.sendDeliveryUpdate({ params: { id: 'plot1' }, user: { _id: 'dev1' }, body: { message: 'Update' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('returns 409 when no purchase orders exist for this plot at all', async () => {
    Plot.findOne.mockResolvedValue({ _id: 'plot1', buyer: 'buyer1' });
    Order.findOne.mockReturnValue({ sort: jest.fn().mockResolvedValue({ _id: 'order1' }) });
    PurchaseOrder.find.mockResolvedValue([]);
    const res = mockRes();
    await plotController.sendDeliveryUpdate({ params: { id: 'plot1' }, user: { _id: 'dev1' }, body: { message: 'Update' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('falls back to plot-scoped purchase orders when none are linked to the order directly', async () => {
    Plot.findOne.mockResolvedValue({ _id: 'plot1', buyer: 'buyer1' });
    Order.findOne.mockReturnValue({ sort: jest.fn().mockResolvedValue({ _id: 'order1', save: jest.fn().mockResolvedValue(true) }) });
    PurchaseOrder.find
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ _id: 'po1' }]);
    Invoice.find.mockReturnValue({ distinct: jest.fn().mockResolvedValue(['po1']) });

    const res = mockRes();
    await plotController.sendDeliveryUpdate({ params: { id: 'plot1' }, user: { _id: 'dev1' }, body: { message: 'Update' } }, res, jest.fn());

    expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Update sent to buyer.' });
  });

  it('returns 409 when not all suppliers have submitted invoices yet', async () => {
    Plot.findOne.mockResolvedValue({ _id: 'plot1', buyer: 'buyer1' });
    Order.findOne.mockReturnValue({ sort: jest.fn().mockResolvedValue({ _id: 'order1' }) });
    PurchaseOrder.find.mockResolvedValueOnce([{ _id: 'po1' }, { _id: 'po2' }]);
    Invoice.find.mockReturnValue({ distinct: jest.fn().mockResolvedValue(['po1']) });

    const res = mockRes();
    await plotController.sendDeliveryUpdate({ params: { id: 'plot1' }, user: { _id: 'dev1' }, body: { message: 'Update' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('marks the order delivered and notifies the buyer once everything is invoiced', async () => {
    const order = { _id: 'order1', save: jest.fn().mockResolvedValue(true) };
    Plot.findOne.mockResolvedValue({ _id: 'plot1', buyer: 'buyer1' });
    Order.findOne.mockReturnValue({ sort: jest.fn().mockResolvedValue(order) });
    PurchaseOrder.find.mockResolvedValueOnce([{ _id: 'po1' }]);
    Invoice.find.mockReturnValue({ distinct: jest.fn().mockResolvedValue(['po1']) });

    const res = mockRes();
    await plotController.sendDeliveryUpdate({ params: { id: 'plot1' }, user: { _id: 'dev1' }, body: { message: '  All done  ' } }, res, jest.fn());

    expect(order.deliveredAt).toBeInstanceOf(Date);
    expect(order.save).toHaveBeenCalled();
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ recipient: 'buyer1', type: 'delivery_update', message: 'All done' }));
    expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Update sent to buyer.' });
  });
});
