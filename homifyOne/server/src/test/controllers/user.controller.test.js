jest.mock('../../models/User');
jest.mock('../../models/Plot');

const User = require('../../models/User');
const Plot = require('../../models/Plot');
const userController = require('../../controllers/user.controller');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('user.controller getUsers', () => {
  it('lists all users when no role filter is given', async () => {
    User.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([{ _id: 'u1' }]) });
    const res = mockRes();
    await userController.getUsers({ query: {} }, res, jest.fn());

    expect(User.find).toHaveBeenCalledWith({});
    expect(res.json).toHaveBeenCalledWith({ success: true, users: [{ _id: 'u1' }] });
  });

  it('filters by role when given in the query string', async () => {
    User.find.mockReturnValue({ sort: jest.fn().mockResolvedValue([]) });
    const res = mockRes();
    await userController.getUsers({ query: { role: 'supplier' } }, res, jest.fn());
    expect(User.find).toHaveBeenCalledWith({ role: 'supplier' });
  });
});

describe('user.controller getUser', () => {
  it('returns 404 when the user does not exist', async () => {
    User.findById.mockResolvedValue(null);
    const res = mockRes();
    await userController.getUser({ params: { id: 'u1' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns the user when found', async () => {
    User.findById.mockResolvedValue({ _id: 'u1' });
    const res = mockRes();
    await userController.getUser({ params: { id: 'u1' } }, res, jest.fn());
    expect(res.json).toHaveBeenCalledWith({ success: true, user: { _id: 'u1' } });
  });
});

describe('user.controller createUser', () => {
  const validBody = { name: 'New Supplier', email: 'NEW@Example.com', phone: '', password: 'password123', role: 'supplier' };

  it('returns 400 when required fields are missing', async () => {
    const res = mockRes();
    await userController.createUser({ body: { name: 'Only Name' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(User.create).not.toHaveBeenCalled();
  });

  it('returns 400 for an invalid role', async () => {
    const res = mockRes();
    await userController.createUser({ body: { ...validBody, role: 'ghost' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when the password is too short', async () => {
    const res = mockRes();
    await userController.createUser({ body: { ...validBody, password: 'short' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('lowercases the email and creates the user', async () => {
    User.create.mockResolvedValue({ _id: 'u1', email: 'new@example.com' });
    const res = mockRes();
    await userController.createUser({ body: validBody }, res, jest.fn());

    expect(User.create).toHaveBeenCalledWith(expect.objectContaining({ email: 'new@example.com', passwordHash: 'password123' }));
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('returns 409 when the email is already taken', async () => {
    const err = new Error('duplicate');
    err.code = 11000;
    User.create.mockRejectedValue(err);
    const res = mockRes();
    await userController.createUser({ body: validBody }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('forwards unexpected errors to next()', async () => {
    User.create.mockRejectedValue(new Error('db down'));
    const res = mockRes();
    const next = jest.fn();
    await userController.createUser({ body: validBody }, res, next);
    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});

describe('user.controller updateUser', () => {
  it('returns 404 when the user does not exist', async () => {
    User.findByIdAndUpdate.mockResolvedValue(null);
    const res = mockRes();
    await userController.updateUser({ params: { id: 'u1' }, body: { name: 'New Name' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('only patches the fields provided, lowercasing email', async () => {
    User.findByIdAndUpdate.mockResolvedValue({ _id: 'u1', name: 'New Name' });
    const res = mockRes();
    await userController.updateUser({ params: { id: 'u1' }, body: { name: 'New Name', email: 'UP@Example.com' } }, res, jest.fn());

    expect(User.findByIdAndUpdate).toHaveBeenCalledWith('u1', { name: 'New Name', email: 'up@example.com' }, { new: true, runValidators: true });
  });

  it('returns 409 on a duplicate email', async () => {
    const err = new Error('duplicate');
    err.code = 11000;
    User.findByIdAndUpdate.mockRejectedValue(err);
    const res = mockRes();
    await userController.updateUser({ params: { id: 'u1' }, body: { email: 'taken@example.com' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(409);
  });
});

describe('user.controller resetPassword', () => {
  it('returns 400 for a missing or short password', async () => {
    const res = mockRes();
    await userController.resetPassword({ params: { id: 'u1' }, body: { password: 'abc' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 404 when the user does not exist', async () => {
    User.findById.mockResolvedValue(null);
    const res = mockRes();
    await userController.resetPassword({ params: { id: 'u1' }, body: { password: 'password123' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('updates the password hash and saves', async () => {
    const user = { save: jest.fn().mockResolvedValue(true) };
    User.findById.mockResolvedValue(user);
    const res = mockRes();
    await userController.resetPassword({ params: { id: 'u1' }, body: { password: 'password123' } }, res, jest.fn());

    expect(user.passwordHash).toBe('password123');
    expect(user.save).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ success: true, message: 'Password updated.' });
  });
});

describe('user.controller reassignDeveloper', () => {
  it('returns 400 when developerId is missing', async () => {
    const res = mockRes();
    await userController.reassignDeveloper({ params: { id: 'buyer1' }, body: {} }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when the target user is not a buyer', async () => {
    User.findById.mockResolvedValue({ role: 'supplier' });
    const res = mockRes();
    await userController.reassignDeveloper({ params: { id: 'u1' }, body: { developerId: 'd1' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 400 when developerId does not belong to a developer account', async () => {
    User.findById.mockResolvedValue({ _id: 'buyer1', role: 'buyer' });
    User.findOne.mockResolvedValue(null);
    const res = mockRes();
    await userController.reassignDeveloper({ params: { id: 'buyer1' }, body: { developerId: 'not-a-dev' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns 404 when the buyer has no plot to reassign', async () => {
    User.findById.mockResolvedValue({ _id: 'buyer1', role: 'buyer' });
    User.findOne.mockResolvedValue({ _id: 'dev1', role: 'developer' });
    Plot.findOneAndUpdate.mockResolvedValue(null);
    const res = mockRes();
    await userController.reassignDeveloper({ params: { id: 'buyer1' }, body: { developerId: 'dev1' } }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('reassigns the plot to the new developer', async () => {
    User.findById.mockResolvedValue({ _id: 'buyer1', role: 'buyer' });
    User.findOne.mockResolvedValue({ _id: 'dev1', role: 'developer' });
    Plot.findOneAndUpdate.mockResolvedValue({ _id: 'plot1', developer: 'dev1' });
    const res = mockRes();
    await userController.reassignDeveloper({ params: { id: 'buyer1' }, body: { developerId: 'dev1' } }, res, jest.fn());

    expect(Plot.findOneAndUpdate).toHaveBeenCalledWith({ buyer: 'buyer1' }, { developer: 'dev1' }, { new: true });
    expect(res.json).toHaveBeenCalledWith({ success: true, plot: { _id: 'plot1', developer: 'dev1' } });
  });
});
