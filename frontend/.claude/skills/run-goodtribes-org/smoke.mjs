#!/usr/bin/env node
// Smoke driver for GoodTribes.org frontend.
// Usage: node smoke.mjs [--base http://localhost:3000] [--shots /tmp/shots]
// Requires: playwright installed (npm install playwright in a temp dir, or globally)

import { chromium } from 'playwright';
import { mkdir } from 'fs/promises';

const args = process.argv.slice(2);
const BASE = args[args.indexOf('--base') + 1] ?? 'http://localhost:3000';
const SHOTS = args[args.indexOf('--shots') + 1] ?? '/tmp/shots';

await mkdir(SHOTS, { recursive: true });

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();

async function ss(name) {
  const p = `${SHOTS}/${name}.png`;
  await page.screenshot({ path: p });
  console.log(`screenshot: ${p}`);
}

async function go(path, label) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle', timeout: 30000 });
  const url = page.url();
  console.log(`${label}: ${url}`);
  await ss(label);
  return url;
}

// Public pages
await go('/', 'home');
await go('/members', 'members');
await go('/skill', 'skills');
await go('/org', 'orgs');

// Login form (requires AUTH_SECRET to be set or login redirects to /)
const loginUrl = await go('/login', 'login');
if (loginUrl.includes('/login')) {
  const emailInput = await page.$('input[type=email]');
  if (emailInput) {
    await emailInput.fill('test@example.com');
    await ss('login-filled');
    console.log('login form: OK');
  } else {
    console.warn('login form: no email input found');
  }
} else {
  console.warn('login redirect to', loginUrl, '(AUTH_SECRET may be missing)');
}

// Check console errors
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(1000);
if (errors.length) {
  console.error('console errors:', errors);
} else {
  console.log('console errors: none');
}

await browser.close();
console.log(`done — screenshots in ${SHOTS}/`);
