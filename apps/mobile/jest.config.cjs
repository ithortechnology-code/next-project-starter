module.exports = {
  preset: "jest-expo/ios",
  testMatch: ["**/tests/**/*.test.tsx"],
  moduleNameMapper: { "\\.(css)$": "<rootDir>/tests/style-mock.cjs" },
};
