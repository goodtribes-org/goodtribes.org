const nextJest = require("next/jest");
const createJestConfig = nextJest({ dir: "./" });

// Separate from jest.config.js: these tests hit a real Postgres (DATABASE_URL
// must point at one with migrations applied — see
// src/__tests__/integration/README.md) instead of running as pure unit tests.
// Kept as its own config/npm script so `npm test` (unit only) stays fast and
// runnable with no database at all.
const baseJestConfig = createJestConfig({
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.integration.test.ts"],
  modulePathIgnorePatterns: ["<rootDir>/.next/"],
  setupFilesAfterEnv: ["<rootDir>/src/__tests__/integration/jest.setup.ts"],
  // Transactional tests wrap each case in its own Prisma $transaction and
  // roll back at the end (see integration/testDb.ts) instead of truncating
  // tables between tests, so cases in one file can safely run in sequence —
  // but two files running concurrently would still race on the same rows.
  maxWorkers: 1,
});

module.exports = async () => {
  const config = await baseJestConfig();
  config.transformIgnorePatterns = [];
  return config;
};
