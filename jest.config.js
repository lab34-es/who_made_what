/** @type {import('jest').Config} */
export default {
  // Use the native ESM support in Jest
  transform: {},

  // Only look for tests under server/
  roots: ['<rootDir>/server'],

  // Match test files
  testMatch: ['**/__tests__/**/*.test.js'],

  // Ignore client and node_modules
  testPathIgnorePatterns: ['/node_modules/', '/client/'],

  // Enable coverage collection
  collectCoverageFrom: [
    'server/src/**/*.js',
    '!server/src/index.js', // Exclude server bootstrap
  ],
};
