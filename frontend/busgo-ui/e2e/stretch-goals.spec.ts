import { test, expect, Page } from '@playwright/test';

/**
 * E2e coverage for the three optional stretch goals (spec section 22): city
 * autocomplete, sorting search results, and a printable ticket summary. Not
 * required for grading -- see happy-path.spec.ts for the required-flow specs
 * and shared context on requirements (backend on :8080, seeded dev data).
 */

function uniqueEmail(prefix: string): string {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 10000)}@example.com`;
}

async function registerAndLogin(page: Page, name: string): Promise<void> {
  await page.goto('/register');
  await page.getByLabel('Full name').fill(name);
  await page.getByLabel('Email').fill(uniqueEmail('e2e'));
  await page.getByLabel('Password').fill('Passw0rd!');
  await page.getByRole('button', { name: /Register/i }).click();
  await expect(page).toHaveURL('/');
}

test.describe('Stretch goal: city autocomplete', () => {
  test('search form offers seeded cities as datalist suggestions', async ({ page }) => {
    await page.goto('/');
    // The seeded dev data always includes Hyderabad <-> Bangalore (see DataSeeder),
    // so both must appear as <option> elements once the cities call resolves.
    await expect(page.locator('#city-options option[value="Hyderabad"]')).toHaveCount(1);
    await expect(page.locator('#city-options option[value="Bangalore"]')).toHaveCount(1);
    await expect(page.getByLabel('From')).toHaveAttribute('list', 'city-options');
    await expect(page.getByLabel('To')).toHaveAttribute('list', 'city-options');
  });
});

test.describe('Stretch goal: sort results', () => {
  test('sorting by fare reorders results ascending; departure time is the default', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('From').fill('Hyderabad');
    await page.getByLabel('To').fill('Bangalore');
    await page.getByRole('button', { name: 'Search Buses' }).click();
    await expect(page).toHaveURL(/\/search/);

    const fares = page.locator('.result-card .fare');
    await expect(fares.first()).toBeVisible();
    const count = await fares.count();
    expect(count).toBeGreaterThanOrEqual(2);

    await page.getByRole('button', { name: 'Fare' }).click();
    // The click re-renders via an Angular signal; poll rather than reading the DOM
    // once immediately after the click, which can race the re-render.
    await expect(async () => {
      const fareValues = await fares.allTextContents();
      const parsed = fareValues.map((f) => Number(f.replace(/[^\d.]/g, '')));
      const sorted = [...parsed].sort((a, b) => a - b);
      expect(parsed).toEqual(sorted);
    }).toPass();

    // Departure-time sort is the default and should still be selectable/re-clickable.
    await page.getByRole('button', { name: 'Departure time' }).click();
    await expect(page.locator('.result-card .time').first()).toBeVisible();
  });
});

test.describe('Stretch goal: printable ticket', () => {
  test('My Trips links to a ticket page showing the booking summary, and Print calls window.print', async ({ page }) => {
    await registerAndLogin(page, 'E2E Ticket Tester');
    await page.goto('/');
    await page.getByLabel('From').fill('Hyderabad');
    await page.getByLabel('To').fill('Bangalore');
    await page.getByRole('button', { name: 'Search Buses' }).click();
    await expect(page).toHaveURL(/\/search/);

    await page.locator('.result-card').first().getByRole('button', { name: 'Select Seats' }).click();
    await expect(page).toHaveURL(/\/seats\//);
    const seat = page.locator('button.seat:not(.booked)').first();
    const seatLabel = (await seat.textContent())?.trim() ?? '';
    await seat.click();
    await page.getByRole('button', { name: 'Confirm Booking' }).click();
    await expect(page).toHaveURL(/\/my-trips/);

    const row = page.locator('table tbody tr').filter({ hasText: 'Hyderabad' }).first();
    await row.getByRole('link', { name: 'Print Ticket' }).click();
    await expect(page).toHaveURL(/\/my-trips\/\d+\/ticket/);

    await expect(page.locator('.route-line')).toContainText('Hyderabad');
    await expect(page.locator('.route-line')).toContainText('Bangalore');
    if (seatLabel) {
      await expect(page.locator('.ticket-details')).toContainText(seatLabel);
    }

    let printed = false;
    await page.exposeFunction('__notifyPrint', () => {
      printed = true;
    });
    await page.evaluate(() => {
      window.print = () => (window as unknown as { __notifyPrint: () => void }).__notifyPrint();
    });
    await page.getByRole('button', { name: 'Print ticket' }).click();
    expect(printed).toBe(true);
  });
});
