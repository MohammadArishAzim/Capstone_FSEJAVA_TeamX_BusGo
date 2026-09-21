# Dev 6 — Booking & My Trips

Owner: Mohammad Arish Azim (Dev 6). From the team task-allocation document:

> **Backend:** Booking & BookingSeat entities, `POST /api/bookings`, `GET /api/bookings/mine`,
> `PUT /api/bookings/{id}/cancel`.
> **Frontend:** My Trips page with active/cancelled bookings, "Confirm Booking" dialog, and
> "Cancel Booking" action button.
> **Day 6:** compile Swagger/OpenAPI docs and the Postman collection.

Team decisions this branch follows: individual ownership model, Java package `com.busgo`, React
frontend.

## What Dev 6 owns (file map)

**Backend** (`backend/src/main/java/com/busgo/`)

| File | Role |
|---|---|
| `entity/Booking.java`, `entity/BookingSeat.java`, `entity/BookingStatus.java` | Booking (1) — (M) BookingSeat; status `BOOKED` / `CANCELLED`. No separate Seat table: booked seats are derived from BookingSeat rows of `BOOKED` bookings |
| `repository/BookingRepository.java`, `repository/BookingSeatRepository.java` | `findByUserOrderByBookedAtDesc`, `findBookedSeatNumbers(scheduleId)` |
| `service/BookingService.java` | create (validation + conflict check under a row lock), list mine, cancel (owner or admin) |
| `controller/BookingController.java`, `dto/BookingDtos.java` | REST layer + request/response records |

**Tests** (`backend/src/test/java/com/busgo/service/`)

| File | What it proves |
|---|---|
| `BookingServiceTest` | 10 Mockito unit tests: conflicts, duplicate/out-of-range seats, not-found, cancel by owner / admin / stranger / already cancelled |
| `BookingConcurrencyTest` | 3 **real-database** tests: 8 threads racing for one seat → exactly one wins; different seats → all succeed; cancel then rebook works. Verified to fail (double booking) if the lock is removed |

**Frontend** (`frontend/busgo-ui/src/`)

| File | Role |
|---|---|
| `features/my-trips/MyTripsPage.tsx` | My Trips: All/Active/Cancelled tabs, cancel with confirmation, error/empty/loading states |
| `features/booking/ConfirmBookingDialog.tsx` | Confirm Booking dialog; owns the `POST /api/bookings` call |
| `components/ConfirmDialog.tsx` | Reusable accessible modal (Bootstrap markup, no Bootstrap JS) |
| `api/bookings.ts`, `api/client.ts`, `types/booking.ts` | API calls, fetch wrapper (Bearer token, structured errors), types |
| `*.test.ts(x)`, `e2e/my-trips.spec.ts` | 22 Vitest tests + 7 Playwright specs |

**Shared files Dev 6 touched** (kept minimal, additive):
- `ScheduleRepository.findByIdForUpdate` (Dev 3's file): a `SELECT … FOR UPDATE` lookup used by
  `createBooking`. This is the seat double-booking fix.
- Nothing else outside Dev 6 files. `/api/bookings/**` needs no `SecurityConfig` change: it falls
  under `anyRequest().authenticated()`.

**Placeholders that are *not* Dev 6's** (each marked `TEMPORARY SHIM` in the source; delete when
the owner's real version lands): `src/auth/AuthContext.tsx`, `src/pages/LoginPage.tsx`,
`src/App.tsx` (shell/Navbar), and the dev-only `src/pages/DevBookingDialogPage.tsx`.

## API contract

All require `Authorization: Bearer <jwt>`. Errors use the team-wide shape
`{ "timestamp", "path", "error", "message" }`.

| Method & path | Request | Success | Errors |
|---|---|---|---|
| `POST /api/bookings` | `{ scheduleId, seatNumbers[1..4] }` | `201` `BookingResponse` | `400` validation · `404` schedule not found · `409` seat already booked / duplicate / out of range · `401` |
| `GET /api/bookings/mine` | — | `200` `BookingResponse[]`, newest first | `401` |
| `PUT /api/bookings/{id}/cancel` | — | `200` `BookingResponse` (status `CANCELLED`, seats freed) | `403` not owner/admin · `404` · `409` already cancelled · `401` |

`BookingResponse`: `id, scheduleId, fromCity, toCity, journeyDate, departureTime, arrivalTime,
busNumber, operatorName, seatNumbers[], status, totalFare, bookedAt, cancelledAt`.

## Integration contracts for other developers

**Dev 5 (seat selection) — mount the Confirm Booking dialog:**

```tsx
import { ConfirmBookingDialog } from '../features/booking';

{confirmOpen && (
  <ConfirmBookingDialog
    schedule={schedule}            // needs: id, fromCity, toCity, journeyDate, departureTime,
                                   //        arrivalTime, operatorName, busNumber, fare
    seatNumbers={selectedSeats}    // 1-4 seats, e.g. ['1A', '1B']
    onBooked={() => navigate('/my-trips')}
    onClose={() => setConfirmOpen(false)}
    onConflict={reloadSeatMap}     // fired on a 409 so you can refresh booked seats
  />
)}
```

The search-result objects from `GET /api/schedules` already satisfy `schedule`.

**Dev 1 (auth) — what the Dev 6 code depends on:**
- `useAuth()` returning `{ user, isLoggedIn, login, logout }` (only `logout` is used, on a `401`).
- The JWT in `localStorage['busgo_token']`; `src/api/client.ts` reads it and sends
  `Authorization: Bearer …`. If the team's auth stores the token elsewhere, change the one
  `TOKEN_KEY` constant.
- A `RequireAuth` route guard (a shim is included) protecting `/my-trips`.

**Mounting My Trips in the real app:** route `/my-trips` →
`<RequireAuth><MyTripsPage /></RequireAuth>`.

## Design notes

- **Seat double-booking.** `createBooking` reads the booked seats and then inserts, which is a
  check-then-act race. It now loads the schedule with a pessimistic write lock, so concurrent
  bookings for one schedule serialize. A plain unique DB constraint can't express the rule
  ("unique among `BOOKED` bookings"), because a cancelled booking's seat rows must not block
  rebooking; a partial index isn't portable across H2 and Postgres through JPA alone.
- **"Cancel upcoming trips" (spec §5).** The UI offers cancel only for `BOOKED` trips whose journey
  date is today or later. The backend does not enforce this; it will cancel a past trip if asked.
  Say so if you want the rule enforced server-side (a small `BookingService.cancel` change).
- **Cancellation of past trips / refunds / payment:** out of scope per the spec (no payment).

## Open questions for the team

1. **Auth mechanism.** The Dev 2 prototype (`Kanchana-K24/bus-management-ui`) uses hardcoded HTTP
   Basic `admin` / `admin123` and a `role` key in localStorage; Dev 6 assumes the spec's JWT
   (`/api/auth/login` → token). Booking endpoints need to know *which user* is calling, so this
   needs one team decision.
2. **Language and libraries.** Dev 2's frontend is plain JS with axios; Dev 6's is TypeScript with
   `fetch` (the spec lists TypeScript). Both use React 19, Vite, react-router-dom 7 and Bootstrap
   5, so mixing is workable, but pick one convention for the merged app.
3. **Java package.** Dev 6 uses `com.busgo`; Dev 2's backend repo uses
   `Capstone_FSEJAVA_Team53_BusGo.bus_management_api`. Entities must share one package to
   compile together (Booking → `User`, `Schedule`, `Bus`).
4. **Spring Boot version.** Dev 6 builds on Spring Boot 3.3.4; Dev 2's `pom.xml` uses Spring Boot
   4.1.1 (and the Boot 4 starter names). Modules must converge on one version to merge.

## Running it

```bash
cd backend && mvn test                     # 30 tests (incl. BookingConcurrencyTest)
cd backend && mvn spring-boot:run          # :8080, seeded H2
cd frontend/busgo-ui && npm install && npm run dev   # :5173
cd frontend/busgo-ui && npm test && npm run lint && npm run build && npm run e2e
```

Seeded logins: `admin@busgo.com` / `Admin@123`; register any passenger via `POST /api/auth/register`.
Dev-only dialog harness: `/dev/booking-dialog?date=<seeded date>&seats=5A,5B` (logged in).
