module.exports = {
  roots: ['<rootDir>/src/'],
  preset: 'ts-jest',
  automock: false,
  setupFiles: ['<rootDir>/test/setupJest.ts'],
  moduleNameMapper: {
    '^~/(.*)$': '<rootDir>/$1',
  },
};
