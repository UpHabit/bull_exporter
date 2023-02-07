module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverage: false,
  testPathIgnorePatterns: [
    '<rootDir>/(dist|node_modules)/',
    '[.]js$',
    '[.]util[.][jt]s$',
    '[.]d[.][jt]s$',
  ],
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.util.ts'],
  transform: {
    '\\.[jt]sx?$': ["ts-jest", { tsconfig: '__tests__/tsconfig.json' }],
  },
};
