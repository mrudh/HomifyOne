const fs = require('fs');
const rootDir = fs.realpathSync(__dirname);

module.exports = {
  testEnvironment: 'node',
  rootDir,
  testMatch: ['<rootDir>/src/test/**/*.test.js'],
  setupFiles: ['<rootDir>/src/test/setup.js'],
  clearMocks: true,
  verbose: true,
  testTimeout: 30000,
};
