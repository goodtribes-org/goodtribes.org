const nextJest = require("next/jest");
const createJestConfig = nextJest({ dir: "./" });

const baseJestConfig = createJestConfig({
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.ts?(x)"],
  // Integration tests (see jest.integration.config.js) need a real Postgres
  // and run via their own `test:integration` script — excluded here so plain
  // `npm test` stays a fast, dependency-free unit run.
  testPathIgnorePatterns: ["<rootDir>/.next/", "\\.integration\\.test\\.ts$"],
  modulePathIgnorePatterns: ["<rootDir>/.next/"],
});

// isomorphic-dompurify (used by sanitizeHtml.ts) requires the "jsdom" package
// unconditionally on Node, and the vendored jsdom's own dependency tree
// (parse5, @exodus/bytes, html-encoding-sniffer, ...) is a mix of ESM-only
// packages, some hoisted to the top-level node_modules and some nested under
// isomorphic-dompurify/node_modules depending on version resolution. A
// name-based transformIgnorePatterns allowlist would have to chase that whole
// (and version-dependent) tree one broken import at a time, so instead this
// disables transform-ignoring for node_modules entirely: every file goes
// through next/jest's SWC transform, which handles ESM and CJS input equally
// well, regardless of nesting/hoisting. Overriding the resolved config's
// transformIgnorePatterns directly (rather than passing it into
// createJestConfig) is what actually replaces next/jest's own array instead
// of appending to it.
module.exports = async () => {
  const config = await baseJestConfig();
  config.transformIgnorePatterns = [];
  return config;
};
