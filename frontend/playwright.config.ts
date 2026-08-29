import { defineConfig, devices } from "@playwright/test";

// Real E2E smoke suite against a fully running app -- Postgres/Redis/
// Meilisearch/MinIO plus the Next.js server itself, not a mocked or
// static build. This is point 05 of the "Blueprint for GoodTribes"
// architecture memo's test-strategy ask (see CLAUDE.md): unit tests and
// real-Postgres integration tests (frontend/src/__tests__/integration/)
// already existed; this is the missing third layer.
//
// Nothing here starts the app -- it always points at an already-running
// server via PLAYWRIGHT_BASE_URL, matching how CI brings the docker-compose
// stack up first (see .github/workflows/docker-image.yml) and how a human
// would run `docker compose up` or `npm run dev:frontend` locally before
// `npm run test:e2e`.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
