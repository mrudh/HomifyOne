jest.mock('../../models/PurchaseOrder');
jest.mock('../../models/User');
jest.mock('../../services/calendarSync.service');
jest.mock('../../services/notification.service');

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../app');
const PurchaseOrder = require('../../models/PurchaseOrder');
const User = require('../../models/User');
const { syncSupplierEta } = require('../../services/calendarSync.service');
const { notify } = require('../../services/notification.service');

function tokenFor(user) {
  return jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

function mockAuthedUser(user) {
  User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ isActive: true, ...user }) });
}

const supplier = { _id: 'supplier1', name: 'Acme Tiles', role: 'supplier' };
const developer = { _id: 'dev1', name: 'Dev Dan', role: 'developer' };

describe('purchase order routes - auth enforcement', () => {
  it('rejects requests with no token at all', async () => {
    const res = await request(app).get('/api/purchase-orders');
    expect(res.status).toBe(401);
  });

  it('blocks a developer from hitting supplier-only routes', async () => {
    mockAuthedUser(developer);
    const res = await request(app).get('/api/purchase-orders').set('Authorization', `Bearer ${tokenFor(developer)}`);
    expect(res.status).toBe(403);
  });
});

describe('GET /api/purchase-orders/developer/all', () => {
  it('lists the developer\'s purchase orders, applying optional filters', async () => {
    mockAuthedUser(developer);
    const chain = { populate: jest.fn(), sort: jest.fn() };
    chain.populate.mockReturnValue(chain);
    chain.sort.mockResolvedValue([{ _id: 'po1' }]);
    PurchaseOrder.find.mockReturnValue(chain);

    const res = await request(app)
      .get('/api/purchase-orders/developer/all?status=pending')
      .set('Authorization', `Bearer ${tokenFor(developer)}`);

    expect(res.status).toBe(200);
    expect(res.body.orders).toEqual([{ _id: 'po1' }]);
    expect(PurchaseOrder.find).toHaveBeenCalledWith({ developer: 'dev1', status: 'pending' });
  });
});

describe('GET /api/purchase-orders/developer/:id', () => {
  it('returns 404 when the order does not belong to this developer', async () => {
    mockAuthedUser(developer);
    const chain = { populate: jest.fn() };
    chain.populate.mockReturnValue(chain);
    chain.populate.mockImplementation(function () { return this; });
    PurchaseOrder.findOne.mockReturnValue({ populate: () => ({ populate: () => ({ populate: () => Promise.resolve(null) }) }) });

    const res = await request(app)
      .get('/api/purchase-orders/developer/po1')
      .set('Authorization', `Bearer ${tokenFor(developer)}`);

    expect(res.status).toBe(404);
  });

  it('returns the order for its owning developer', async () => {
    mockAuthedUser(developer);
    PurchaseOrder.findOne.mockReturnValue({ populate: () => ({ populate: () => ({ populate: () => Promise.resolve({ _id: 'po1' }) }) }) });

    const res = await request(app)
      .get('/api/purchase-orders/developer/po1')
      .set('Authorization', `Bearer ${tokenFor(developer)}`);

    expect(res.status).toBe(200);
    expect(res.body.order).toEqual({ _id: 'po1' });
  });
});

describe('GET /api/purchase-orders (supplier list) and /:id', () => {
  it('lists purchase orders for the requesting supplier', async () => {
    mockAuthedUser(supplier);
    const chain = { populate: jest.fn(), sort: jest.fn() };
    chain.populate.mockReturnValue(chain);
    chain.sort.mockResolvedValue([{ _id: 'po1' }]);
    PurchaseOrder.find.mockReturnValue(chain);

    const res = await request(app).get('/api/purchase-orders').set('Authorization', `Bearer ${tokenFor(supplier)}`);
    expect(res.status).toBe(200);
    expect(PurchaseOrder.find).toHaveBeenCalledWith({ supplier: 'supplier1' });
  });

  it('returns 404 for a purchase order not owned by this supplier', async () => {
    mockAuthedUser(supplier);
    PurchaseOrder.findOne.mockReturnValue({ populate: () => ({ populate: () => ({ populate: () => Promise.resolve(null) }) }) });

    const res = await request(app).get('/api/purchase-orders/po1').set('Authorization', `Bearer ${tokenFor(supplier)}`);
    expect(res.status).toBe(404);
  });

  it('returns the purchase order detail for its supplier', async () => {
    mockAuthedUser(supplier);
    PurchaseOrder.findOne.mockReturnValue({ populate: () => ({ populate: () => ({ populate: () => Promise.resolve({ _id: 'po1' }) }) }) });

    const res = await request(app).get('/api/purchase-orders/po1').set('Authorization', `Bearer ${tokenFor(supplier)}`);
    expect(res.status).toBe(200);
    expect(res.body.order).toEqual({ _id: 'po1' });
  });
});

describe('PATCH /api/purchase-orders/:id/acknowledge', () => {
  it('returns 404 when the order is not found for this supplier', async () => {
    mockAuthedUser(supplier);
    PurchaseOrder.findOne.mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });

    const res = await request(app).patch('/api/purchase-orders/po1/acknowledge').set('Authorization', `Bearer ${tokenFor(supplier)}`);
    expect(res.status).toBe(404);
  });

  it('acknowledges a pending order and notifies the developer', async () => {
    mockAuthedUser(supplier);
    const order = { status: 'pending', developer: 'dev1', plot: { plotNumber: '5' }, save: jest.fn().mockResolvedValue(true) };
    PurchaseOrder.findOne.mockReturnValue({ populate: jest.fn().mockResolvedValue(order) });

    const res = await request(app)
      .patch('/api/purchase-orders/po1/acknowledge')
      .set('Authorization', `Bearer ${tokenFor(supplier)}`);

    expect(res.status).toBe(200);
    expect(order.status).toBe('acknowledged');
    expect(order.acknowledgedAt).toBeInstanceOf(Date);
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ recipient: 'dev1', type: 'purchase_order_status_changed' }));
  });

  it('does nothing when the order is already past the pending stage', async () => {
    mockAuthedUser(supplier);
    const order = { status: 'sent', developer: 'dev1', plot: { plotNumber: '5' }, save: jest.fn().mockResolvedValue(true) };
    PurchaseOrder.findOne.mockReturnValue({ populate: jest.fn().mockResolvedValue(order) });

    const res = await request(app)
      .patch('/api/purchase-orders/po1/acknowledge')
      .set('Authorization', `Bearer ${tokenFor(supplier)}`);

    expect(res.status).toBe(200);
    expect(order.save).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });
});

describe('PATCH /api/purchase-orders/:id/status', () => {
  it('rejects an invalid status', async () => {
    mockAuthedUser(supplier);
    const res = await request(app)
      .patch('/api/purchase-orders/po1/status')
      .set('Authorization', `Bearer ${tokenFor(supplier)}`)
      .send({ status: 'not-a-real-status' });
    expect(res.status).toBe(400);
  });

  it('returns 404 when the order is not found', async () => {
    mockAuthedUser(supplier);
    PurchaseOrder.findOne.mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });
    const res = await request(app)
      .patch('/api/purchase-orders/po1/status')
      .set('Authorization', `Bearer ${tokenFor(supplier)}`)
      .send({ status: 'sent' });
    expect(res.status).toBe(404);
  });

  it('updates the status and notifies the developer', async () => {
    mockAuthedUser(supplier);
    const order = { status: 'acknowledged', developer: 'dev1', plot: { plotNumber: '5' }, save: jest.fn().mockResolvedValue(true) };
    PurchaseOrder.findOne.mockReturnValue({ populate: jest.fn().mockResolvedValue(order) });

    const res = await request(app)
      .patch('/api/purchase-orders/po1/status')
      .set('Authorization', `Bearer ${tokenFor(supplier)}`)
      .send({ status: 'sent' });

    expect(res.status).toBe(200);
    expect(order.status).toBe('sent');
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ recipient: 'dev1' }));
  });
});

describe('PATCH /api/purchase-orders/:id/eta', () => {
  it('requires an eta date', async () => {
    mockAuthedUser(supplier);
    const res = await request(app)
      .patch('/api/purchase-orders/po1/eta')
      .set('Authorization', `Bearer ${tokenFor(supplier)}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns 404 when the order is not found', async () => {
    mockAuthedUser(supplier);
    PurchaseOrder.findOneAndUpdate.mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });
    const res = await request(app)
      .patch('/api/purchase-orders/po1/eta')
      .set('Authorization', `Bearer ${tokenFor(supplier)}`)
      .send({ eta: '2026-09-15' });
    expect(res.status).toBe(404);
  });

  it('sets the ETA, syncs the calendar, and notifies the developer', async () => {
    mockAuthedUser(supplier);
    const order = {
      _id: 'po1',
      developer: { _id: 'dev1' },
      supplier: { name: 'Acme Tiles' },
      plot: { plotNumber: '5' },
    };
    PurchaseOrder.findOneAndUpdate.mockReturnValue({ populate: jest.fn().mockResolvedValue(order) });
    syncSupplierEta.mockResolvedValue(true);

    const res = await request(app)
      .patch('/api/purchase-orders/po1/eta')
      .set('Authorization', `Bearer ${tokenFor(supplier)}`)
      .send({ eta: '2026-09-15' });

    expect(res.status).toBe(200);
    expect(syncSupplierEta).toHaveBeenCalledWith(order);
    expect(notify).toHaveBeenCalledWith(expect.objectContaining({ recipient: 'dev1' }));
  });
});
