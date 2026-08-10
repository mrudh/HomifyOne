jest.mock('../../models/PromoCode');
jest.mock('../../models/Plot');

const PromoCode = require('../../models/PromoCode');
const Plot = require('../../models/Plot');
const { validatePromo } = require('../../controllers/promo.controller');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function baseReq(body = {}) {
  return { user: { _id: 'buyer1' }, body: { code: 'SAVE10', ...body } };
}

describe('promo.controller validatePromo', () => {
  it('returns 400 when no code is provided', async () => {
    const req = baseReq({ code: '' });
    const res = mockRes();
    const next = jest.fn();

    await validatePromo(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(PromoCode.findOne).not.toHaveBeenCalled();
  });

  it('uppercases the code before looking it up', async () => {
    PromoCode.findOne.mockResolvedValue(null);
    const req = baseReq({ code: 'save10' });
    const res = mockRes();
    const next = jest.fn();

    await validatePromo(req, res, next);

    expect(PromoCode.findOne).toHaveBeenCalledWith({ code: 'SAVE10' });
  });

  it('returns 404 when the code does not exist', async () => {
    PromoCode.findOne.mockResolvedValue(null);
    const req = baseReq();
    const res = mockRes();
    const next = jest.fn();

    await validatePromo(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 403 when the code is assigned to a different buyer', async () => {
    PromoCode.findOne.mockResolvedValue({ assignedTo: 'someone-else' });
    const req = baseReq();
    const res = mockRes();
    const next = jest.fn();

    await validatePromo(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 410 when the code has expired', async () => {
    PromoCode.findOne.mockResolvedValue({ assignedTo: null, expiresAt: new Date(Date.now() - 1000) });
    const req = baseReq();
    const res = mockRes();
    const next = jest.fn();

    await validatePromo(req, res, next);

    expect(res.status).toHaveBeenCalledWith(410);
  });

  it('returns 409 when the code has already been used', async () => {
    PromoCode.findOne.mockResolvedValue({ assignedTo: null, expiresAt: null, usedAt: new Date() });
    const req = baseReq();
    const res = mockRes();
    const next = jest.fn();

    await validatePromo(req, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('returns 409 for a first-order code when the buyer already has a prior order', async () => {
    PromoCode.findOne.mockResolvedValue({ assignedTo: null, expiresAt: null, usedAt: null, scope: 'first_order' });
    Plot.exists.mockResolvedValue(true);
    const req = baseReq();
    const res = mockRes();
    const next = jest.fn();

    await validatePromo(req, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('maps a percentage promo to type "percent" in the response', async () => {
    PromoCode.findOne.mockResolvedValue({
      code: 'SAVE10', assignedTo: null, expiresAt: null, usedAt: null,
      scope: 'all_orders', type: 'percentage', value: 10, maxDiscount: 200,
    });
    const req = baseReq();
    const res = mockRes();
    const next = jest.fn();

    await validatePromo(req, res, next);

    expect(res.json).toHaveBeenCalledWith({
      success: true, code: 'SAVE10', discount: 10, type: 'percent', maxDiscount: 200, expiresAt: null,
    });
  });

  it('maps a fixed promo to type "fixed" and defaults a missing maxDiscount to null', async () => {
    PromoCode.findOne.mockResolvedValue({
      code: 'FLAT5', assignedTo: null, expiresAt: null, usedAt: null,
      scope: 'all_orders', type: 'fixed', value: 5, maxDiscount: undefined,
    });
    const req = baseReq({ code: 'FLAT5' });
    const res = mockRes();
    const next = jest.fn();

    await validatePromo(req, res, next);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ type: 'fixed', maxDiscount: null }));
  });

  it('forwards unexpected errors to next()', async () => {
    PromoCode.findOne.mockImplementation(() => { throw new Error('DB unreachable'); });
    const req = baseReq();
    const res = mockRes();
    const next = jest.fn();

    await validatePromo(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
  });
});
