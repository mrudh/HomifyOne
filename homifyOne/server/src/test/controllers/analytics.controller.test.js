jest.mock('../../models/Plot');
jest.mock('../../models/Order');
jest.mock('../../models/Product');
jest.mock('../../models/PurchaseOrder');
jest.mock('../../models/Invoice');
jest.mock('../../models/Selection');
jest.mock('../../models/User');

const Plot = require('../../models/Plot');
const Order = require('../../models/Order');
const Product = require('../../models/Product');
const PurchaseOrder = require('../../models/PurchaseOrder');
const Invoice = require('../../models/Invoice');
const Selection = require('../../models/Selection');
const User = require('../../models/User');
const analyticsController = require('../../controllers/analytics.controller');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function mockHappyPath() {
  Plot.aggregate.mockResolvedValueOnce([{ _id: 'assigned', count: 3 }]);
  Plot.countDocuments
    .mockResolvedValueOnce(10)
    .mockResolvedValueOnce(2);

  Order.aggregate
    .mockResolvedValueOnce([{ _id: 'approved', count: 5 }])
    .mockResolvedValueOnce([{ total: 4500, avg: 900, count: 5 }])
    .mockResolvedValueOnce([{ _id: '2026-01', revenue: 1000 }])
    .mockResolvedValueOnce([{ _id: 'Worktops', timesChosen: 8 }]);

  Product.countDocuments.mockResolvedValueOnce(40);
  Product.aggregate
    .mockResolvedValueOnce([{ _id: 'Worktops', avgPrice: 500.456, count: 3 }])
    .mockResolvedValueOnce([{ _id: 'master bedroom', count: 5 }, { _id: 'Bedroom', count: 3 }, { _id: 'Kitchen', count: 4 }]);

  PurchaseOrder.countDocuments
    .mockResolvedValueOnce(20)
    .mockResolvedValueOnce(15);
  PurchaseOrder.aggregate
    .mockResolvedValueOnce([{ avgDays: 2.345 }])
    .mockResolvedValueOnce([
      { _id: 'supplier1', supplier: 'Acme Tiles', total: 10, fulfilled: 9, avgTurnaroundDays: 3.1 },
      { _id: null, supplier: 'Unknown supplier', total: 2, fulfilled: 1, avgTurnaroundDays: null },
    ]);

  Invoice.countDocuments
    .mockResolvedValueOnce(30)
    .mockResolvedValueOnce(3);

  User.countDocuments.mockResolvedValueOnce(50);
  User.aggregate
    .mockResolvedValueOnce([{ _id: 'buyer', count: 30 }, { _id: 'developer', count: 5 }])
    .mockResolvedValueOnce([{ _id: '2026-01', count: 4 }]);

  Selection.countDocuments
    .mockResolvedValueOnce(25)
    .mockResolvedValueOnce(10);
}

describe('analytics.controller getOverview', () => {
  it('assembles the full overview payload with correct calculations', async () => {
    mockHappyPath();
    const res = mockRes();
    await analyticsController.getOverview({}, res, jest.fn());

    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);

    expect(payload.data.plots.total).toBe(10);
    expect(payload.data.plots.overdue).toBe(2);

    expect(payload.data.orders.totalRevenue).toBe(4500);
    expect(payload.data.orders.avgOrderValue).toBe(900);

    expect(payload.data.products.totalActive).toBe(40);
    expect(payload.data.products.avgPriceByCategory[0]).toEqual({ category: 'Worktops', avgPrice: 500.46, count: 3 });

    expect(payload.data.suppliers.fulfillmentRate).toBe(75);
    expect(payload.data.suppliers.avgTurnaroundDays).toBe(2.3);
    expect(payload.data.suppliers.invoiceFlaggedRate).toBe(10);

    expect(payload.data.users.total).toBe(50);
    expect(payload.data.users.questionnaireCompletionRate).toBe(40);
  });

  it('merges "master bedroom" and "bedroom" room labels into a single "Bedroom" count', async () => {
    mockHappyPath();
    const res = mockRes();
    await analyticsController.getOverview({}, res, jest.fn());

    const payload = res.json.mock.calls[0][0];
    const bedroomEntry = payload.data.products.byRoom.find((r) => r.room === 'Bedroom');
    expect(bedroomEntry.count).toBe(8);
  });

  it('filters out supplier rows with a null _id (unassigned purchase orders)', async () => {
    mockHappyPath();
    const res = mockRes();
    await analyticsController.getOverview({}, res, jest.fn());

    const payload = res.json.mock.calls[0][0];
    expect(payload.data.suppliers.bySupplier).toHaveLength(1);
    expect(payload.data.suppliers.bySupplier[0].supplier).toBe('Acme Tiles');
  });

  it('returns zeroed rates when there is no data yet, without dividing by zero', async () => {
    Plot.aggregate.mockResolvedValueOnce([]);
    Plot.countDocuments.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    Order.aggregate
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    Product.countDocuments.mockResolvedValueOnce(0);
    Product.aggregate.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    PurchaseOrder.countDocuments.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    PurchaseOrder.aggregate.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    Invoice.countDocuments.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    User.countDocuments.mockResolvedValueOnce(0);
    User.aggregate.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    Selection.countDocuments.mockResolvedValueOnce(0).mockResolvedValueOnce(0);

    const res = mockRes();
    await analyticsController.getOverview({}, res, jest.fn());

    const payload = res.json.mock.calls[0][0];
    expect(payload.data.suppliers.fulfillmentRate).toBe(0);
    expect(payload.data.suppliers.invoiceFlaggedRate).toBe(0);
    expect(payload.data.users.questionnaireCompletionRate).toBe(0);
    expect(payload.data.orders.totalRevenue).toBe(0);
  });

  it('forwards errors to next() when a query fails', async () => {
    Plot.aggregate.mockRejectedValueOnce(new Error('db unreachable'));
    const res = mockRes();
    const next = jest.fn();
    await analyticsController.getOverview({}, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
