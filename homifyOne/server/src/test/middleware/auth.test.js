jest.mock('jsonwebtoken');
jest.mock('../../models/User');

const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const { verifyToken, authorise } = require('../../middleware/auth');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('verifyToken', () => {
  it('returns 401 when no token is present on the request', async () => {
    const req = { headers: {}, cookies: {} };
    const res = mockRes();
    const next = jest.fn();

    await verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Not authenticated. Please log in.' });
    expect(next).not.toHaveBeenCalled();
  });

  it('reads the token from the Authorization header when present', async () => {
    const req = { headers: { authorization: 'Bearer good-token' }, cookies: {} };
    const res = mockRes();
    const next = jest.fn();
    const activeUser = { _id: 'u1', isActive: true, role: 'buyer' };

    jwt.verify.mockReturnValue({ userId: 'u1' });
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(activeUser) });

    await verifyToken(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith('good-token', 'test-jwt-secret');
    expect(req.user).toEqual(activeUser);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('falls back to reading the token from cookies when no Authorization header is set', async () => {
    const req = { headers: {}, cookies: { token: 'cookie-token' } };
    const res = mockRes();
    const next = jest.fn();
    const activeUser = { _id: 'u1', isActive: true, role: 'buyer' };

    jwt.verify.mockReturnValue({ userId: 'u1' });
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(activeUser) });

    await verifyToken(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith('cookie-token', 'test-jwt-secret');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('returns 401 when the decoded user no longer exists', async () => {
    const req = { headers: { authorization: 'Bearer good-token' }, cookies: {} };
    const res = mockRes();
    const next = jest.fn();

    jwt.verify.mockReturnValue({ userId: 'ghost' });
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });

    await verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'User no longer exists or is inactive.' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when the user account has been deactivated', async () => {
    const req = { headers: { authorization: 'Bearer good-token' }, cookies: {} };
    const res = mockRes();
    const next = jest.fn();

    jwt.verify.mockReturnValue({ userId: 'u1' });
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ _id: 'u1', isActive: false }) });

    await verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns a "session expired" message for an expired token', async () => {
    const req = { headers: { authorization: 'Bearer expired-token' }, cookies: {} };
    const res = mockRes();
    const next = jest.fn();

    const err = new Error('jwt expired');
    err.name = 'TokenExpiredError';
    jwt.verify.mockImplementation(() => { throw err; });

    await verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Session expired. Please log in again.' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns a generic "invalid token" message for any other verification failure', async () => {
    const req = { headers: { authorization: 'Bearer garbage' }, cookies: {} };
    const res = mockRes();
    const next = jest.fn();

    jwt.verify.mockImplementation(() => { throw new Error('malformed'); });

    await verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Invalid token.' });
    expect(next).not.toHaveBeenCalled();
  });
});

describe('authorise', () => {
  it('calls next() when the user role is in the allowed list', () => {
    const req = { user: { role: 'developer' } };
    const res = mockRes();
    const next = jest.fn();

    authorise('developer', 'admin')(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 403 when the user role is not in the allowed list', () => {
    const req = { user: { role: 'buyer' } };
    const res = mockRes();
    const next = jest.fn();

    authorise('developer', 'admin')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Access denied. Required role: developer or admin.',
    });
    expect(next).not.toHaveBeenCalled();
  });
});
