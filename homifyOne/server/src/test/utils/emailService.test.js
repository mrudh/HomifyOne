jest.mock('nodemailer', () => {
  const sendMail = jest.fn().mockResolvedValue(true);
  return { createTransport: jest.fn(() => ({ sendMail })), __sendMail: sendMail };
});

const nodemailer = require('nodemailer');
const { sendOTP, sendNotificationEmail } = require('../../utils/emailService');

describe('emailService', () => {
  beforeEach(() => {
    nodemailer.__sendMail.mockClear();
  });

  describe('sendOTP', () => {
    it('sends the OTP to the correct recipient with the OTP visible in the body', async () => {
      await sendOTP('jane@gmail.com', 'Jane', '123456');

      expect(nodemailer.__sendMail).toHaveBeenCalledTimes(1);
      const call = nodemailer.__sendMail.mock.calls[0][0];
      expect(call.to).toBe('jane@gmail.com');
      expect(call.subject).toBe('Your HomifyOne Password Reset Code');
      expect(call.html).toContain('123456');
      expect(call.html).toContain('Jane');
    });

    it('sends from the configured HomifyOne email address', async () => {
      await sendOTP('jane@gmail.com', 'Jane', '123456');
      const call = nodemailer.__sendMail.mock.calls[0][0];
      expect(call.from).toBe('"HomifyOne" <test@homifyone.com>');
    });
  });

  describe('sendNotificationEmail', () => {
    it('sends the given subject and message to the recipient', async () => {
      await sendNotificationEmail('supplier@gmail.com', 'Acme Supplies', 'New purchase order', 'You have a new order.');

      expect(nodemailer.__sendMail).toHaveBeenCalledTimes(1);
      const call = nodemailer.__sendMail.mock.calls[0][0];
      expect(call.to).toBe('supplier@gmail.com');
      expect(call.subject).toBe('New purchase order');
      expect(call.html).toContain('Acme Supplies');
      expect(call.html).toContain('You have a new order.');
    });
  });
});
