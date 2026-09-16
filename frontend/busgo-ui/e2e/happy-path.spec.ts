import { test, expect, Page } from '@playwright/test';

/**
 * End-to-end happy path for BusGo, covering the acceptance criteria in the
 * capstone spec (section 15): register -> search -> select seats -> confirm
 * booking -> see it in My Trips -> cancel it. A second spec covers the admin
 * flow (login as seeded admin -> add a schedule -> confirm it appears in
 * search).
 *
 * Not required for grading (spec explicitly waives e2e at this level) — this
 * is an extra safety net. Requires the backend running on :8080 with the
 * seeded dev data (Hyderabad -> Bangalore schedules, admin@busgo.com).
 */

function uniqueEmail(prefix: string): string {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 10000)}@example.com`;
}

async function registerAndLogin(page: Page, name: string): Promise<string> {
  const email = uniqueEmail('e2e');
  await page.goto('/register');
  await page.getByLabel('Full name').fill(name);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill('Passw0rd!');
  await page.getByRole('button', { name: /Register/i }).click();
  // Registration logs the user straight in and redirects home (see AuthService).
  await expect(page).toHaveURL('/');
  return email;
}

async function searchRoute(page: Page, from: string, to: string, isoDate?: string): Promise<void> {
  await page.getByLabel('From').fill(from);
  await page.getByLabel('To').fill(to);
  if (isoDate) {
    await page.locator('input[type="date"]').fill(isoDate);
  }
  await page.getByRole('button', { name: 'Search Buses' }).click();
  await expect(page).toHaveURL(/\/search/);
}

async function openFirstResultSeats(page: Page): Promise<void> {
  const firstResult = page.locator('.result-card').first();
  await expect(firstResult).toBeVisible();
  await firstResult.getByRole('button', { name: 'Select Seats' }).click();
  await expect(page).toHaveURL(/\/seats\//);
}

test.describe('BusGo happy path', () => {
  test('search finds the seeded Hyderabad -> Bangalore buses', async ({ page }) => {
    await page.goto('/');
    // The home form already defaults the date a few days out to a date that
    // matches the seed data; leave it as-is rather than hardcoding a date
    // that will eventually be in the past.
    await searchRoute(page, 'Hyderabad', 'Bangalore');

    const resultCards = page.locator('.result-card');
    await expect(resultCards.first()).toBeVisible();
    expect(await resultCards.count()).toBeGreaterThanOrEqual(2);

    // Each result shows operator, times and fare per the spec's results list.
    await expect(resultCards.first().locator('.operator')).toBeVisible();
    await expect(resultCards.first().locator('.fare')).toContainText('₹');
  });

  test('register, book two seats, see the trip, then cancel it', async ({ page }) => {
    await registerAndLogin(page, 'E2E Passenger');

    await page.goto('/');
    await searchRoute(page, 'Hyderabad', 'Bangalore');
    await openFirstResultSeats(page);

    // Seat selection: pick the first two available (non-booked) seats.
    const availableSeats = page.locator('button.seat:not(.booked)');
    await expect(availableSeats.first()).toBeVisible();
    const seatLabels: string[] = [];
    for (let i = 0; i < 2; i++) {
      const seat = availableSeats.nth(i);
      seatLabels.push((await seat.textContent())?.trim() ?? '');
      await seat.click();
    }
    await expect(page.locator('.selected-summary')).toContainText('2');

    await page.getByRole('button', { name: 'Confirm Booking' }).click();

    // Confirming redirects to My Trips with the new booking listed as BOOKED.
    await expect(page).toHaveURL(/\/my-trips/);
    const row = page.locator('table tbody tr').filter({ hasText: 'Hyderabad' }).first();
    await expect(row).toBeVisible();
    await expect(row).toContainText('BOOKED');
    for (const label of seatLabels) {
      if (label) await expect(row).toContainText(label);
    }

    // Cancel it: status flips to CANCELLED and the Cancel button disappears.
    // my-trips.ts guards the cancel action behind a window.confirm() dialog,
    // which Playwright auto-dismisses unless a handler accepts it first.
    page.once('dialog', (dialog) => dialog.accept());
    await row.getByRole('button', { name: /Cancel/i }).click();
    await expect(row).toContainText('CANCELLED');
    await expect(row.getByRole('button', { name: /Cancel/i })).toHaveCount(0);
  });

  test('booked seats cannot be selected again by another user', async ({ page }) => {
    // Book one seat as user A.
    await registerAndLogin(page, 'E2E User A');
    await page.goto('/');
    await searchRoute(page, 'Hyderabad', 'Bangalore');
    await openFirstResultSeats(page);

    const availableSeats = page.locator('button.seat:not(.booked)');
    const seatToBook = availableSeats.first();
    const seatLabel = (await seatToBook.textContent())?.trim() ?? '';
    await seatToBook.click();
    await page.getByRole('button', { name: 'Confirm Booking' }).click();
    await expect(page).toHaveURL(/\/my-trips/);

    // As a fresh (unauthenticated) session, revisit the same schedule and
    // confirm that seat now shows as booked/disabled.
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());
    await page.goto('/');
    await searchRoute(page, 'Hyderabad', 'Bangalore');
    await openFirstResultSeats(page);

    const sameSeatButton = page.locator('button.seat', { hasText: seatLabel });
    await expect(sameSeatButton).toHaveClass(/booked/);
    await expect(sameSeatButton).toBeDisabled();
  });
});

test.describe('BusGo admin flow', () => {
  test('admin can add a schedule and it appears in search', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('admin@busgo.com');
    await page.getByLabel('Password').fill('Admin@123');
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page).toHaveURL('/');

    await page.goto('/admin/schedules');
    await expect(page.getByRole('heading', { name: 'Schedules', level: 3 })).toBeVisible();

    // Use a distinctive city pair so the search assertion below can't match
    // pre-existing seed data by accident.
    const fromCity = `E2ECity${Date.now()}`;
    const toCity = 'E2EDestination';

    await page.getByRole('button', { name: 'Add Schedule' }).click();

    // Schedule form (schedule-form.html): a bus <select> plus fromCity,
    // toCity, journeyDate, departureTime, arrivalTime, fare inputs. The bus
    // select defaults to the disabled "Select a bus" option (value 0), so it
    // must be explicitly chosen or the form stays invalid.
    await page.locator('#busId').selectOption({ index: 1 });
    await page.getByLabel('From City').fill(fromCity);
    await page.getByLabel('To City').fill(toCity);
    // Compute entirely in UTC (not local-time setDate + UTC toISOString) so
    // the date can't drift by a day depending on the runner's timezone.
    const now = new Date();
    const journeyDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 5));
    const isoDate = journeyDate.toISOString().slice(0, 10);
    await page.getByLabel('Journey Date').fill(isoDate);
    await page.getByLabel('Departure Time').fill('09:00');
    await page.getByLabel('Arrival Time').fill('17:00');
    await page.getByLabel(/^Fare/).fill('999');

    await page.getByRole('button', { name: 'Save' }).click();

    // Confirm it now appears in search results for that route/date.
    await page.goto('/');
    await searchRoute(page, fromCity, toCity, isoDate);

    await expect(page.locator('.result-card')).toHaveCount(1);
    await expect(page.locator('.fare')).toContainText('999');
  });

  test('non-admin is redirected away from /admin', async ({ page }) => {
    await registerAndLogin(page, 'E2E Regular User');
    await page.goto('/admin');
    await expect(page).not.toHaveURL(/\/admin/);
  });
});
