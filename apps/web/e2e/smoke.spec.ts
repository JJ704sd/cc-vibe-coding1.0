import { test, expect } from '@playwright/test';

/**
 * Round 1 smoke tests — prove the e2e harness boots the API + web servers,
 * applies the fixture seed, and serves the public pages. Round 2 will
 * expand this directory with the full ~25-scenario matrix.
 */

test.describe('Public pages — Round 1 smoke', () => {
  test('home page loads with the brand title', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(/Trace Scope/);
  });

  test('projects page surfaces the e2e fixture project after loading', async ({ page }) => {
    await page.goto('/projects');
    // The loading skeleton renders first, then either cards or EmptyState.
    await expect(page.locator('[data-testid="projects-loading"]')).toBeHidden({ timeout: 10_000 });
    await expect(page.getByText('E2E Test Project')).toBeVisible();
  });
});

test.describe('Public API — Round 1 smoke', () => {
  test('GET /api/public/projects returns the fixture project', async ({ request }) => {
    const response = await request.get('/api/public/projects');
    expect(response.status()).toBe(200);
    // Actual response shape is { items: ProjectCard[] }, not a bare array.
    // See apps/api/src/modules/public/service.ts:listProjects().
    const body = await response.json();
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items.some((p: { title: string }) => p.title === 'E2E Test Project')).toBe(true);
  });

  test('GET /health reports the API as live', async ({ request }) => {
    // The lightweight liveness probe is mounted at /health (not /api/health/live).
    // The /api/health/live prefix is reserved for the full readiness probe that
    // also checks database + storage. See apps/api/src/app/buildServer.ts:108.
    //
    // Vite's dev server only proxies /api/* to the API (see vite.config.ts),
    // so a request to baseURL (/health) would be served the SPA index.html.
    // Hit the API port directly to exercise the real endpoint.
    const apiBaseUrl = process.env.PLAYWRIGHT_API_URL ?? 'http://127.0.0.1:4000';
    const response = await request.get(`${apiBaseUrl}/health`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ status: 'ok' });
  });
});