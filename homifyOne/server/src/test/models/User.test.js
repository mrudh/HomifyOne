const bcrypt = require('bcryptjs');
const User = require('../../models/User');

describe('User model', () => {
  describe('comparePassword', () => {
    it('resolves true when the plain password matches the stored hash', async () => {
      const hash = await bcrypt.hash('correct-password', 4);
      const user = new User({
        name: 'Jane',
        email: 'jane@gmail.com',
        passwordHash: hash,
        role: 'buyer',
      });

      await expect(user.comparePassword('correct-password')).resolves.toBe(true);
    });

    it('resolves false when the plain password does not match', async () => {
      const hash = await bcrypt.hash('correct-password', 4);
      const user = new User({
        name: 'Jane',
        email: 'jane@gmail.com',
        passwordHash: hash,
        role: 'buyer',
      });

      await expect(user.comparePassword('wrong-password')).resolves.toBe(false);
    });
  });

  describe('schema validation', () => {
    it('requires name, email, passwordHash and role', () => {
      const user = new User({});
      const err = user.validateSync();

      expect(err.errors.name).toBeDefined();
      expect(err.errors.email).toBeDefined();
      expect(err.errors.passwordHash).toBeDefined();
      expect(err.errors.role).toBeDefined();
    });

    it('rejects a role outside the allowed enum', () => {
      const user = new User({
        name: 'Jane',
        email: 'jane@gmail.com',
        passwordHash: 'hashed',
        role: 'superadmin',
      });
      const err = user.validateSync();

      expect(err.errors.role).toBeDefined();
    });

    it('accepts each of the four valid roles', () => {
      ['buyer', 'developer', 'supplier', 'admin'].forEach((role) => {
        const user = new User({
          name: 'Jane',
          email: 'jane@gmail.com',
          passwordHash: 'hashed',
          role,
        });
        expect(user.validateSync()).toBeUndefined();
      });
    });

    it('defaults isActive to true and credit to 0', () => {
      const user = new User({
        name: 'Jane',
        email: 'jane@gmail.com',
        passwordHash: 'hashed',
        role: 'buyer',
      });
      expect(user.isActive).toBe(true);
      expect(user.credit).toBe(0);
    });

    it('lowercases the email on assignment', () => {
      const user = new User({
        name: 'Jane',
        email: 'JANE@gmail.COM',
        passwordHash: 'hashed',
        role: 'buyer',
      });
      expect(user.email).toBe('jane@gmail.com');
    });
  });

  describe('toJSON', () => {
    it('strips passwordHash, otp and otpExpiry from the serialised output', () => {
      const user = new User({
        name: 'Jane',
        email: 'jane@gmail.com',
        passwordHash: 'hashed',
        role: 'buyer',
        otp: '123456',
        otpExpiry: new Date(),
      });

      const json = user.toJSON();
      expect(json.passwordHash).toBeUndefined();
      expect(json.otp).toBeUndefined();
      expect(json.otpExpiry).toBeUndefined();
      expect(json.name).toBe('Jane');
      expect(json.email).toBe('jane@gmail.com');
    });
  });
});
