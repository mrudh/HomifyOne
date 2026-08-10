jest.mock('../../utils/emailService');

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../app');
const User = require('../../models/User');
const Plot = require('../../models/Plot');
const Order = require('../../models/Order');
const PromoCode = require('../../models/PromoCode');
const Notification = require('../../models/Notification');
const db = require('./dbHandler');

beforeAll(async () => {
  await db.connect();
});

afterEach(async () => {
  await db.clearDatabase();
});

afterAll(async () => {
  await db.closeDatabase();
});

function tokenFor(user) {
  return jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
}


async function waitForNotification(query, attempts = 20) {
  for (let i = 0; i < attempts; i++) {
    const found = await Notification.findOne(query);
    if (found) return found;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return null;
}

async function seedBuyerWithPlot(overrides = {}) {
  const developer = await User.create({
    name: 'Dana Developer',
    email: 'dana@gmail.com',
    passwordHash: 'x',
    role: 'developer',
  });
  const buyer = await User.create({
    name: 'Jane Buyer',
    email: 'jane@gmail.com',
    passwordHash: 'x',
    role: 'buyer',
    ...overrides,
  });
  const plot = await Plot.create({
    developer: developer._id,
    buyer: buyer._id,
    plotNumber: '12',
    address: '1 Test Street',
    development: 'Test Gardens',
  });
  return { developer, buyer, plot };
}

describe('POST /api/selections/submit', () => {
  it('creates a real order, confirms selections, updates the plot, and notifies the real developer', async () => {
    const { developer, buyer, plot } = await seedBuyerWithPlot();
    const token = tokenFor(buyer);

    const res = await request(app)
      .post('/api/selections/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [{ name: 'Cabinet', price: 500, type: 'standard' }], pricing: { subtotal: 500, finalTotal: 500 } });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.orderId).toBeDefined();

    const order = await Order.findById(res.body.orderId);
    expect(order).not.toBeNull();
    expect(String(order.plot)).toBe(String(plot._id));
    expect(String(order.buyer)).toBe(String(buyer._id));
    expect(order.items[0].name).toBe('Cabinet');

    const updatedPlot = await Plot.findById(plot._id);
    expect(updatedPlot.status).toBe('selections_submitted');

    const notification = await waitForNotification({ recipient: developer._id, type: 'order_submitted' });
    expect(notification).not.toBeNull();
    expect(notification.message).toContain('Jane Buyer');
  });

  it('rejects submission for a buyer with no assigned plot', async () => {
    const buyer = await User.create({
      name: 'No Plot Buyer', email: 'noplot@gmail.com', passwordHash: 'x', role: 'buyer',
    });
    const token = tokenFor(buyer);

    const res = await request(app)
      .post('/api/selections/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [], pricing: {} });

    expect(res.status).toBe(404);
  });

  it('blocks a second submission while one is still awaiting developer review', async () => {
    const { buyer, plot } = await seedBuyerWithPlot();
    const token = tokenFor(buyer);

    await Order.create({ plot: plot._id, buyer: buyer._id, items: [], pricing: {}, status: 'submitted' });

    const res = await request(app)
      .post('/api/selections/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [], pricing: {} });

    expect(res.status).toBe(409);
  });

  it('rejects a promo code that does not exist in the real database', async () => {
    const { buyer } = await seedBuyerWithPlot();
    const token = tokenFor(buyer);

    const res = await request(app)
      .post('/api/selections/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [], pricing: {}, promoCode: 'GHOST10' });

    expect(res.status).toBe(404);
  });

  it('marks a real, valid promo code as used and still creates the order', async () => {
    const { buyer } = await seedBuyerWithPlot();
    const token = tokenFor(buyer);
    await PromoCode.create({
      code: 'SAVE10', value: 10, scope: 'all_orders', expiresAt: new Date(Date.now() + 86400000),
    });

    const res = await request(app)
      .post('/api/selections/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [], pricing: { subtotal: 100, finalTotal: 90 }, promoCode: 'save10' });

    expect(res.status).toBe(200);
    const promo = await PromoCode.findOne({ code: 'SAVE10' });
    expect(promo.usedAt).not.toBeNull();
  });

  it('blocks buyers from submitting to routes reserved for their own plot (RBAC via real role)', async () => {
    const { developer } = await seedBuyerWithPlot();
    const token = tokenFor(developer);

    const res = await request(app)
      .post('/api/selections/submit')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [], pricing: {} });

    expect(res.status).toBe(403);
  });
});
