jest.mock('../../utils/emailService');

const request = require('supertest');
const app = require('../../app');
const User = require('../../models/User');
const { sendOTP } = require('../../utils/emailService');
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

async function createUser(overrides = {}) {
  return User.create({
    name: 'Jane Buyer',
    email: 'jane@gmail.com',
    passwordHash: 'correct-password', 
    role: 'buyer',
    ...overrides,
  });
}

describe('POST /api/auth/login', () => {
  it('logs a real user in against the real database and returns a working cookie + token', async () => {
    await createUser();

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'jane@gmail.com', password: 'correct-password', role: 'buyer' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ email: 'jane@gmail.com', role: 'buyer' });
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.headers['set-cookie'][0]).toMatch(/^token=/);
  });

  it('rejects the real user when the password is wrong', async () => {
    await createUser();

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'jane@gmail.com', password: 'wrong-password', role: 'buyer' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('rejects login for a role the account does not have, even with the right password', async () => {
    await createUser({ role: 'buyer' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'jane@gmail.com', password: 'correct-password', role: 'developer' });

    expect(res.status).toBe(401);
  });

  it('returns 400 from the real express-validator chain for a malformed request', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'not-an-email', password: '', role: 'nonsense-role' });

    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual(expect.any(Array));
  });
});

describe('GET /api/auth/me (verifyToken middleware)', () => {
  it('rejects requests with no token at all', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('accepts a real signed-in session and returns the real user from the database', async () => {
    await createUser();
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'jane@gmail.com', password: 'correct-password', role: 'buyer' });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${login.body.token}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('jane@gmail.com');
  });

  it('rejects a token for a user who was deactivated after the token was issued', async () => {
    const user = await createUser();
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'jane@gmail.com', password: 'correct-password', role: 'buyer' });

    user.isActive = false;
    await user.save();

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${login.body.token}`);

    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/dev-only (verifyToken + authorise chained together)', () => {
  it('blocks a real buyer account, proving RBAC runs against the real user role', async () => {
    await createUser({ role: 'buyer' });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'jane@gmail.com', password: 'correct-password', role: 'buyer' });

    const res = await request(app)
      .get('/api/auth/dev-only')
      .set('Authorization', `Bearer ${login.body.token}`);

    expect(res.status).toBe(403);
  });

  it('allows a real developer account through both middleware layers', async () => {
    await createUser({ email: 'dev@gmail.com', role: 'developer' });
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'dev@gmail.com', password: 'correct-password', role: 'developer' });

    const res = await request(app)
      .get('/api/auth/dev-only')
      .set('Authorization', `Bearer ${login.body.token}`);

    expect(res.status).toBe(200);
  });
});

describe('forgot-password -> reset-password full round trip', () => {
  it('generates a real OTP on the real user record, then lets them log in with the new password', async () => {
    await createUser();
    sendOTP.mockResolvedValue(true);

    const forgotRes = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'jane@gmail.com' });
    expect(forgotRes.status).toBe(200);

    const stored = await User.findOne({ email: 'jane@gmail.com' });
    expect(stored.otp).toMatch(/^\d{6}$/);
    expect(sendOTP).toHaveBeenCalledWith('jane@gmail.com', 'Jane Buyer', stored.otp);

    const resetRes = await request(app)
      .post('/api/auth/reset-password')
      .send({ email: 'jane@gmail.com', otp: stored.otp, newPassword: 'brand-new-password' });
    expect(resetRes.status).toBe(200);

    // Old password should no longer work
    const oldLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'jane@gmail.com', password: 'correct-password', role: 'buyer' });
    expect(oldLogin.status).toBe(401);

    // and the new one should.
    const newLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'jane@gmail.com', password: 'brand-new-password', role: 'buyer' });
    expect(newLogin.status).toBe(200);
  });

  it('rejects a reset attempt with a wrong OTP against the real stored value', async () => {
    await createUser();
    sendOTP.mockResolvedValue(true);

    await request(app).post('/api/auth/forgot-password').send({ email: 'jane@gmail.com' });

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ email: 'jane@gmail.com', otp: '000000', newPassword: 'brand-new-password' });

    expect(res.status).toBe(400);
  });
});
