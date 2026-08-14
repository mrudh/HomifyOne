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
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/test/**',
    '!src/server.js',
    '!src/scripts/**',
    '!src/seed.js',
    '!src/seedPlots.js',
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'text-summary', 'html', 'lcov'],
};
