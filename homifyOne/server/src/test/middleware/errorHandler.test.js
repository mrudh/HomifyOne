const errorHandler = require('../../middleware/errorHandler');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('errorHandler middleware', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('defaults to a 500 status with a generic message when the error has neither', () => {
    const res = mockRes();
    errorHandler(new Error(), {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Internal Server Error' });
  });

  it('uses the error\'s own statusCode and message when provided', () => {
    const res = mockRes();
    const err = new Error('Plot not found.');
    err.statusCode = 404;

    errorHandler(err, {}, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Plot not found.' });
  });

  it('logs the error to the console for observability', () => {
    const res = mockRes();
    const err = new Error('Something broke');
    err.statusCode = 400;

    errorHandler(err, {}, res, jest.fn());

    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('400 - Something broke'));
  });
});
