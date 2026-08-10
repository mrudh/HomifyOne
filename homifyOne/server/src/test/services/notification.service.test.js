jest.mock('../../models/Notification');
jest.mock('../../models/User');
jest.mock('../../utils/emailService');

const Notification = require('../../models/Notification');
const User = require('../../models/User');
const { sendNotificationEmail } = require('../../utils/emailService');
const { notify, setIO } = require('../../services/notification.service');

describe('notification.service notify()', () => {
  beforeEach(() => {
    setIO(null);
    Notification.create.mockResolvedValue({ _id: 'n1', type: 'order_submitted' });
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ name: 'Jane', email: 'jane@example.com' }) });
    sendNotificationEmail.mockResolvedValue(true);
  });

  it('creates the in-app notification and returns it', async () => {
    const result = await notify({ recipient: 'u1', type: 'order_submitted', title: 'New order' });

    expect(Notification.create).toHaveBeenCalledWith({
      recipient: 'u1', type: 'order_submitted', title: 'New order', message: '', link: '', meta: {},
    });
    expect(result).toEqual({ _id: 'n1', type: 'order_submitted' });
  });

  it('emits a socket event to the recipient when an io instance is registered', async () => {
    const emit = jest.fn();
    const io = { to: jest.fn().mockReturnValue({ emit }) };
    setIO(io);

    await notify({ recipient: 'u1', type: 'order_submitted', title: 'New order' });

    expect(io.to).toHaveBeenCalledWith('u1');
    expect(emit).toHaveBeenCalledWith('notification:new', { _id: 'n1', type: 'order_submitted' });
  });

  it('does not attempt to emit when no io instance has been registered', async () => {
    await expect(notify({ recipient: 'u1', type: 'order_submitted', title: 'New order' })).resolves.toBeDefined();
  });

  it('sends a fallback email to the recipient using their name and the notification title/message', async () => {
    await notify({ recipient: 'u1', type: 'order_submitted', title: 'New order', message: 'Details here' });

    expect(User.findById).toHaveBeenCalledWith('u1');
    expect(sendNotificationEmail).toHaveBeenCalledWith('jane@example.com', 'Jane', 'New order', 'Details here');
  });

  it('falls back to "there" when the recipient has no name on file', async () => {
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ email: 'jane@example.com' }) });

    await notify({ recipient: 'u1', type: 'order_submitted', title: 'New order' });

    expect(sendNotificationEmail).toHaveBeenCalledWith('jane@example.com', 'there', 'New order', '');
  });

  it('skips the email entirely when the recipient has no email on file', async () => {
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ name: 'Jane' }) });

    await notify({ recipient: 'u1', type: 'order_submitted', title: 'New order' });

    expect(sendNotificationEmail).not.toHaveBeenCalled();
  });

  it('swallows a DB failure creating the notification and returns undefined without attempting email', async () => {
    Notification.create.mockRejectedValue(new Error('Mongo down'));

    const result = await notify({ recipient: 'u1', type: 'order_submitted', title: 'New order' });

    expect(result).toBeUndefined();
    expect(User.findById).not.toHaveBeenCalled();
    expect(sendNotificationEmail).not.toHaveBeenCalled();
  });

  it('still returns the notification if the email fallback itself fails', async () => {
    User.findById.mockReturnValue({ select: jest.fn().mockRejectedValue(new Error('User lookup failed')) });

    const result = await notify({ recipient: 'u1', type: 'order_submitted', title: 'New order' });

    expect(result).toEqual({ _id: 'n1', type: 'order_submitted' });
  });
});
