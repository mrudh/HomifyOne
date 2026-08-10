jest.mock('../../models/User');
jest.mock('../../utils/emailService');
jest.mock('jsonwebtoken');
jest.mock('express-validator');

const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../../models/User');
const { sendOTP } = require('../../utils/emailService');
const authController = require('../../controllers/auth.controller');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.cookie = jest.fn().mockReturnValue(res);
  res.clearCookie = jest.fn().mockReturnValue(res);
  return res;
}

function noValidationErrors() {
  validationResult.mockReturnValue({ isEmpty: () => true, array: () => [] });
}

describe('auth.controller login', () => {
  beforeEach(() => noValidationErrors());

  it('returns 400 with the validator errors when the request body is invalid', async () => {
    validationResult.mockReturnValue({ isEmpty: () => false, array: () => [{ msg: 'Email is required' }] });
    const req = { body: {} };
    const res = mockRes();
    const next = jest.fn();

    await authController.login(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, errors: [{ msg: 'Email is required' }] });
    expect(User.findOne).not.toHaveBeenCalled();
  });

  it('returns 401 when no matching active user exists for that email/role', async () => {
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
    const req = { body: { email: 'nobody@gmail.com', password: 'x', role: 'buyer' } };
    const res = mockRes();
    const next = jest.fn();

    await authController.login(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Invalid email, password, or role.' });
  });

  it('returns 401 when the password does not match', async () => {
    const user = { _id: 'u1', comparePassword: jest.fn().mockResolvedValue(false) };
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
    const req = { body: { email: 'jane@gmail.com', password: 'wrong', role: 'buyer' } };
    const res = mockRes();
    const next = jest.fn();

    await authController.login(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Invalid email, password, or role.' });
  });

  it('issues a signed cookie and returns the token + safe user fields on success', async () => {
    const user = {
      _id: 'u1',
      name: 'Jane',
      email: 'jane@gmail.com',
      role: 'buyer',
      comparePassword: jest.fn().mockResolvedValue(true),
    };
    User.findOne.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
    jwt.sign.mockReturnValue('signed.jwt.token');

    const req = { body: { email: 'jane@gmail.com', password: 'correct', role: 'buyer' } };
    const res = mockRes();
    const next = jest.fn();

    await authController.login(req, res, next);

    expect(jwt.sign).toHaveBeenCalledWith({ userId: 'u1', role: 'buyer' }, 'test-jwt-secret', { expiresIn: '7d' });
    expect(res.cookie).toHaveBeenCalledWith('token', 'signed.jwt.token', expect.objectContaining({ httpOnly: true }));
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      token: 'signed.jwt.token',
      user: { _id: 'u1', name: 'Jane', email: 'jane@gmail.com', role: 'buyer' },
    });
  });

  it('forwards unexpected errors to next()', async () => {
    User.findOne.mockImplementation(() => { throw new Error('DB down'); });
    const req = { body: { email: 'jane@gmail.com', password: 'x', role: 'buyer' } };
    const res = mockRes();
    const next = jest.fn();

    await authController.login(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('auth.controller logout', () => {
  it('clears the auth cookie and confirms success', () => {
    const req = {};
    const res = mockRes();

    authController.logout(req, res);

    expect(res.clearCookie).toHaveBeenCalledWith('token');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Logged out successfully.' });
  });
});

describe('auth.controller forgotPassword', () => {
  it('returns the same generic message for an unknown email, without generating an OTP', async () => {
    User.findOne.mockResolvedValue(null);
    const req = { body: { email: 'nobody@gmail.com' } };
    const res = mockRes();
    const next = jest.fn();

    await authController.forgotPassword(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, message: 'If that email exists, a reset code has been sent.' });
    expect(sendOTP).not.toHaveBeenCalled();
  });

  it('generates and stores an OTP, then emails it, for a known active user', async () => {
    const user = { email: 'jane@gmail.com', name: 'Jane', save: jest.fn().mockResolvedValue(true) };
    User.findOne.mockResolvedValue(user);
    sendOTP.mockResolvedValue(true);

    const req = { body: { email: 'jane@gmail.com' } };
    const res = mockRes();
    const next = jest.fn();

    await authController.forgotPassword(req, res, next);

    expect(user.otp).toMatch(/^\d{6}$/);
    expect(user.otpExpiry).toBeInstanceOf(Date);
    expect(user.save).toHaveBeenCalledWith({ validateBeforeSave: false });
    expect(sendOTP).toHaveBeenCalledWith('jane@gmail.com', 'Jane', user.otp);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('still returns success even if the OTP email fails to send', async () => {
    const user = { email: 'jane@gmail.com', name: 'Jane', save: jest.fn().mockResolvedValue(true) };
    User.findOne.mockResolvedValue(user);
    sendOTP.mockRejectedValue(new Error('SMTP down'));

    const req = { body: { email: 'jane@gmail.com' } };
    const res = mockRes();
    const next = jest.fn();

    await authController.forgotPassword(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, message: 'If that email exists, a reset code has been sent.' });
  });
});

describe('auth.controller resetPassword', () => {
  it('returns 400 for an invalid or expired reset code', async () => {
    User.findOne.mockResolvedValue(null);
    const req = { body: { email: 'jane@gmail.com', otp: '000000', newPassword: 'newpass123' } };
    const res = mockRes();
    const next = jest.fn();

    await authController.resetPassword(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Invalid or expired reset code.' });
    expect(User.updateOne).not.toHaveBeenCalled();
  });

  it('hashes the new password and clears the OTP fields on a valid reset', async () => {
    User.findOne.mockResolvedValue({ _id: 'u1' });
    User.updateOne.mockResolvedValue({ acknowledged: true });

    const req = { body: { email: 'jane@gmail.com', otp: '123456', newPassword: 'newpassword' } };
    const res = mockRes();
    const next = jest.fn();

    await authController.resetPassword(req, res, next);

    expect(User.updateOne).toHaveBeenCalledWith(
      { _id: 'u1' },
      expect.objectContaining({
        $set: expect.objectContaining({ passwordHash: expect.any(String) }),
        $unset: { otp: '', otpExpiry: '' },
      })
    );
    const [, updatePayload] = User.updateOne.mock.calls[0];
    expect(updatePayload.$set.passwordHash).not.toBe('newpassword');
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
