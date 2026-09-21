import { test, expect, type APIRequestContext, type Page } from '@playwright/test';

/**
 * E2e for Dev 6's scope (Confirm Booking dialog, My Trips, cancel) against the real backend
 * (:8080, seeded dev data). Not required by the capstone spec; an extra safety net.
 * Users are created through the API so each test controls exactly which bookings exist.
 */

const API = 'http://localhost:8080/api';

interface Session {
  token: string;
  email: string;
  name: string;
  isAdmin: boolean;
}

interface ScheduleResult {
  id: number;
  seatsAvailable: number;
}

function seededDate(): string {
  // DataSeeder seeds the Hyderabad -> Bangalore schedules 3 days after server startup.
  const d = new Date();
  d.setDate(d.getDate() + 3);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function registerUser(request: APIRequestContext, name: string): Promise<Session> {
  const email = `dev6.${Date.now()}.${Math.floor(Math.random() * 100000)}@example.com`;
  const res = await request.post(`${API}/auth/register`, { data: { email, password: 'Passw0rd!', name } });
  expect(res.status()).toBe(201);
  return (await res.json()) as Session;
}

async function firstSchedule(request: APIRequestContext): Promise<ScheduleResult> {
  const res = await request.get(`${API}/schedules`, {
    params: { from: 'Hyderabad', to: 'Bangalore', date: seededDate() },
  });
  const results = (await res.json()) as ScheduleResult[];
  expect(results.length).toBeGreaterThan(0);
  return results[0];
}

/** Picks currently-free seats so tests never collide with each other or earlier runs. */
async function freeSeats(request: APIRequestContext, scheduleId: number, count: number): Promise<string[]> {
  const res = await request.get(`${API}/schedules/${scheduleId}/seats`);
  const { bookedSeats } = (await res.json()) as { bookedSeats: string[] };
  const free: string[] = [];
  for (let row = 10; row >= 1 && free.length < count; row--) {
    for (const col of ['A', 'B', 'C', 'D']) {
      const seat = `${row}${col}`;
      if (!bookedSeats.includes(seat) && free.length < count) free.push(seat);
    }
  }
  return free;
}

async function bookViaApi(request: APIRequestContext, session: Session, scheduleId: number, seats: string[]) {
  const res = await request.post(`${API}/bookings`, {
    data: { scheduleId, seatNumbers: seats },
    headers: { Authorization: `Bearer ${session.token}` },
  });
  expect(res.status()).toBe(201);
  return (await res.json()) as { id: number };
}

async function signIn(page: Page, session: Session) {
  await page.addInitScript(([token, user]) => {
    localStorage.setItem('busgo_token', token);
    localStorage.setItem('busgo_user', user);
  }, [session.token, JSON.stringify({ email: session.email, name: session.name, isAdmin: session.isAdmin })]);
}

test.describe('My Trips', () => {
  test('anonymous visitors are sent to /login', async ({ page }) => {
    await page.goto('/my-trips');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible();
  });

  test('a new user with no bookings sees the empty state', async ({ page, request }) => {
    await signIn(page, await registerUser(request, 'Empty Tripper'));
    await page.goto('/my-trips');
    await expect(page.getByText("You haven't booked any trips yet.")).toBeVisible();
  });

  test('lists a booking, cancels it through the confirmation dialog, and frees the seats', async ({ page, request }) => {
    const session = await registerUser(request, 'Cancel Tester');
    const schedule = await firstSchedule(request);
    const seats = await freeSeats(request, schedule.id, 2);
    const booking = await bookViaApi(request, session, schedule.id, seats);

    await signIn(page, session);
    await page.goto('/my-trips');
    const row = page.getByTestId(`booking-${booking.id}`);
    await expect(row).toContainText('Hyderabad');
    await expect(row).toContainText('BOOKED');
    await expect(row).toContainText(seats.join(', '));

    await row.getByRole('button', { name: 'Cancel booking' }).click();
    const dialog = page.getByRole('dialog', { name: 'Cancel this booking?' });
    await expect(dialog).toContainText(seats.join(', '));
    await dialog.getByRole('button', { name: 'Yes, cancel booking' }).click();

    await expect(dialog).toBeHidden();
    await expect(row).toContainText('CANCELLED');
    await expect(row.getByRole('button', { name: 'Cancel booking' })).toHaveCount(0);
    await expect(page.getByRole('status')).toContainText(`Booking #${booking.id} cancelled`);

    // Backend truth, not just UI: the seats really are free again.
    const seatMap = await (await request.get(`${API}/schedules/${schedule.id}/seats`)).json();
    for (const seat of seats) expect(seatMap.bookedSeats).not.toContain(seat);

    // Filter tabs.
    await page.getByRole('tab', { name: /Active/ }).click();
    await expect(page.getByTestId(`booking-${booking.id}`)).toHaveCount(0);
    await page.getByRole('tab', { name: /Cancelled/ }).click();
    await expect(page.getByTestId(`booking-${booking.id}`)).toBeVisible();
  });

  test('keeping the booking leaves it untouched', async ({ page, request }) => {
    const session = await registerUser(request, 'Keeper');
    const schedule = await firstSchedule(request);
    const [seat] = await freeSeats(request, schedule.id, 1);
    const booking = await bookViaApi(request, session, schedule.id, [seat]);

    await signIn(page, session);
    await page.goto('/my-trips');
    await page.getByTestId(`booking-${booking.id}`).getByRole('button', { name: 'Cancel booking' }).click();
    await page.getByRole('button', { name: 'Keep booking' }).click();

    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page.getByTestId(`booking-${booking.id}`)).toContainText('BOOKED');
  });

  test('logging in through the form lands on My Trips', async ({ page, request }) => {
    const session = await registerUser(request, 'Form Login');
    await page.goto('/my-trips');
    await page.getByLabel('Email').fill(session.email);
    await page.getByLabel('Password').fill('Passw0rd!');
    await page.getByRole('button', { name: 'Log in' }).click();
    await expect(page).toHaveURL(/\/my-trips/);
    await expect(page.getByRole('heading', { name: 'My Trips' })).toBeVisible();
  });
});

test.describe('Confirm Booking dialog', () => {
  test('books the seats, then the booking shows up in My Trips', async ({ page, request }) => {
    const session = await registerUser(request, 'Dialog Booker');
    const schedule = await firstSchedule(request);
    const seats = await freeSeats(request, schedule.id, 2);

    await signIn(page, session);
    await page.goto(`/dev/booking-dialog?date=${seededDate()}&seats=${seats.join(',')}`);
    await page.getByRole('button', { name: /^Book / }).click();

    const dialog = page.getByRole('dialog', { name: 'Confirm booking' });
    await expect(dialog).toContainText(seats.join(', '));
    await expect(dialog).toContainText('2 ×');
    await dialog.getByRole('button', { name: /Book seats/ }).click();

    await expect(page).toHaveURL(/\/my-trips/);
    const row = page.locator('tbody tr').filter({ hasText: seats.join(', ') });
    await expect(row).toContainText('BOOKED');
  });

  test('a seat taken by someone else in the meantime shows the conflict and keeps the dialog open', async ({
    page,
    request,
  }) => {
    const other = await registerUser(request, 'Seat Thief');
    const me = await registerUser(request, 'Slow Booker');
    const schedule = await firstSchedule(request);
    const [seat] = await freeSeats(request, schedule.id, 1);

    await signIn(page, me);
    await page.goto(`/dev/booking-dialog?date=${seededDate()}&seats=${seat}`);
    await page.getByRole('button', { name: /^Book / }).click(); // dialog opens while the seat is still free
    await bookViaApi(request, other, schedule.id, [seat]); // ...then someone else grabs it

    await page.getByRole('button', { name: /Book seats/ }).click();

    const dialog = page.getByRole('dialog', { name: 'Confirm booking' });
    await expect(dialog.getByRole('alert')).toContainText(`Seat(s) already booked: ${seat}`);
    await expect(dialog).toBeVisible();
    await expect(page.getByText('seat-map refreshes requested after conflicts: 1')).toBeVisible();
  });
});
