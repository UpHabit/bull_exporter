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
  transform: {
    // '^.+\\.[tj]sx?$' to process js/ts with `ts-jest`
    // '^.+\\.m?[tj]sx?$' to process js/ts/mjs/mts with `ts-jest`
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        // ts-jest configuration goes here
        tsconfig: '__tests__/tsconfig.json',
      },
    ],
  },
}