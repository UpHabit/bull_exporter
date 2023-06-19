module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  collectCoverage: false,
  testPathIgnorePatterns: [
    "<rootDir>/(dist|node_modules)/",
    "[.]js$",
    "[.]util[.][jt]s$",
    "[.]d[.][jt]s$",
  ],
  setupTestFrameworkScriptFile: "<rootDir>/__tests__/setup.util.ts",
  globals: {
    "ts-jest": {
      tsConfig: "__tests__/tsconfig.json",
    },
  },
};
