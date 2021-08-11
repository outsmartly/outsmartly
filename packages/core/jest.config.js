module.exports = {
  roots: ['<rootDir>/src/'],
  preset: 'ts-jest',
  setupFiles: ['<rootDir>/src/tests/setupJest.ts'],
  testEnvironment: 'jsdom',
};
