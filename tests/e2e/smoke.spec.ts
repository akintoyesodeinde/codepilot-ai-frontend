import { expect, test } from '@playwright/test';

test.describe('Phases 1–3 Frontend Smoke Suite', () => {
  test('renders landing page and navigates to registration and login forms', async ({ page }) => {
    await page.goto('/');

    await expect(
      page.getByRole('heading', { name: /Production-grade AI code intelligence/i }),
    ).toBeVisible();
    await expect(page.getByText('Live — Phase 1')).toBeVisible();
    await expect(page.getByText('Live — Phase 2')).toBeVisible();
    await expect(page.getByText('Live — Phase 3').first()).toBeVisible();

    await page.getByRole('link', { name: 'Get started' }).click();
    await expect(page).toHaveURL(/\/register$/);
    await expect(
      page.getByRole('heading', { name: /Create your CodePilot AI account/i }),
    ).toBeVisible();

    // Accessible validation on empty submission
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText(/Full name must be at least 2 characters/i)).toBeVisible();
    await expect(page.getByText(/Enter a valid email address/i)).toBeVisible();

    await page.getByRole('link', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: /Sign in to CodePilot AI/i })).toBeVisible();
  });

  test('supports theme toggling and responsive mobile viewport without horizontal overflow', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const themeButton = page.getByRole('button', { name: /Switch to (dark|light) theme/i });
    await expect(themeButton).toBeVisible();
    await themeButton.click();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });
});
