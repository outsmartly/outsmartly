module.exports = {
  roots: ['<rootDir>/src/'],
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFiles: ['<rootDir>/tests/setupJest.ts'],
};
