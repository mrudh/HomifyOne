// Force fixed values for every test run, regardless of what's already in the
// shell environment or a real .env file. Unit tests must be deterministic
// and isolated from real secrets/config — using `||` here would let a real
// JWT_SECRET (or similar) silently leak into test assertions and make the
// suite pass or fail depending on whoever's machine it runs on.
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_EXPIRES_IN = '7d';
process.env.EMAIL_USER = 'test@homifyone.com';
process.env.EMAIL_PASS = 'test-pass';
process.env.NODE_ENV = 'test';
