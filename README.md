# BusGo — Bus Ticket Booking App

A full-stack bus ticket booking application built as a Sprint 1 capstone scaffold for a Full
Stack Engineering training program. Users search buses between cities, pick a departure, select
seats on a 10x4 grid, and confirm a booking. Admins manage the bus fleet and schedules.

Stack: **React 19 + TypeScript + Vite + Bootstrap 5** (frontend) + **Spring Boot 3 / Java 21** (backend) + **JWT auth** (stateless)
+ **H2** (dev) / **PostgreSQL** (prod) + **JUnit 5 / Mockito** + **springdoc-openapi (Swagger)**.

---

## Project layout

```
busgo/
  backend/          Spring Boot API (Maven)
  frontend/
    busgo-ui/        React app (Vite + TypeScript) -- Dev 6 scope: My Trips + Confirm Booking
  docs/
    BusGo.postman_collection.json
    DEV6_SCOPE.md   Dev 6 (Booking & My Trips) ownership, contracts, integration notes
  README.md
```

---

## Running the backend

Requirements: Java 21, Maven (the wrapper is not included — use a system `mvn`).

```bash
cd backend
mvn spring-boot:run
```

This starts on **http://localhost:8080** with the `dev` Spring profile active by default
(configured in `application.yml`), which uses an **in-memory H2 database** — no external database
setup needed to get going.

On every startup, a `CommandLineRunner` (`com.busgo.seed.DataSeeder`) seeds:

- **1 admin user**: `admin@busgo.com` / `Admin@123` (BCrypt-hashed in the DB; this plaintext
  password is documented here only because it's a throwaway dev credential for local grading/demo
  use — never do this for a real deployment).
- **3 buses**, 40 seats each: VRL Travels (SEATER), SRS Travels (SLEEPER), Orange Travels
  (SLEEPER).
- **4 schedules**, including 3 on the **Hyderabad → Bangalore** route on a date **3 days from
  whenever the app is started** (so manual testing works regardless of when you run it — check
  the startup log line "Seeded 3 buses and 4 schedules... on <date>" for the exact date, or just
  search Hyderabad → Bangalore for "today + 3 days" in the UI).

Seeding is idempotent — it checks for existing rows first, so restarting the app doesn't
duplicate data (relevant if you ever switch the H2 URL to a file-based one instead of `mem:`).

**Swagger UI**: http://localhost:8080/swagger-ui.html
**OpenAPI JSON**: http://localhost:8080/v3/api-docs
**H2 console** (dev only): http://localhost:8080/h2-console — JDBC URL
`jdbc:h2:mem:busgo;DB_CLOSE_DELAY=-1;CASE_INSENSITIVE_IDENTIFIERS=TRUE`, user `sa`, empty password.

### Running against PostgreSQL (prod profile)

```bash
export SPRING_PROFILES_ACTIVE=prod
export DB_URL=jdbc:postgresql://localhost:5432/busgo
export DB_USERNAME=busgo
export DB_PASSWORD=busgo
export JWT_SECRET=<a long random string, 32+ bytes>
mvn spring-boot:run
```

Create the `busgo` database and role yourself first (`CREATE DATABASE busgo;` etc.) — schema is
still auto-managed via `ddl-auto: update`, kept simple on purpose for this project rather than
introducing a migration tool like Flyway.

All four env vars above are **required** under the `prod` profile — unlike `dev`, there is no
fallback default for `JWT_SECRET`, `DB_URL`, `DB_USERNAME`, or `DB_PASSWORD`. If any is unset,
Spring fails fast at startup with a clear "could not resolve placeholder" error instead of
silently running with the publicly-committed dev secret or well-known `busgo`/`busgo` credentials.

### Running the tests

```bash
cd backend
mvn test
```

Service-layer unit tests (JUnit 5 + Mockito) live under `src/test/java/com/busgo/service/` and
cover:

- **BookingServiceTest** — seat-conflict detection (the core booking invariant), duplicate/invalid
  seat numbers, not-found schedule, cancel-by-owner, cancel-by-admin-on-someone-else's-booking,
  cancel-forbidden-for-a-third-party, cancel-already-cancelled, list-mine.
- **ScheduleServiceTest** — search parameter validation, derived seats-available calculation,
  seat-map lookup, admin create validation (arrival-after-departure, bus-must-exist).
- **AuthServiceTest** — duplicate-email rejection on register, password hashing delegated to
  `PasswordEncoder`, bad-credentials propagation on login.
- **BusServiceTest** — duplicate bus-number rejection, not-found, delete.

### Coverage

```bash
cd backend
mvn clean verify   # runs tests, generates a JaCoCo report, and fails the build below 60%
open target/site/jacoco/index.html   # full HTML report, package/class/line drill-down
```

The spec's "≥60% method-level" target (section 12) is measured, not asserted: `mvn verify` runs a
JaCoCo coverage check scoped to `com.busgo.service.*` (the package the spec's testing section and
this project's test suite actually target — controllers are thin pass-throughs to services, DTOs
are plain records, and security/config classes are framework wiring, none of which the spec asks
to be unit-tested) and **fails the build** if method coverage there drops below 60%. Measured
result at time of writing: **67.9% method coverage (36/53), 82.9% line coverage** in
`com.busgo.service`. Whole-project method coverage (including the intentionally-untested
controller/DTO/security/config classes) is 34.8% — expected, and not the number the spec's
target applies to.

> **Verified**: `mvn clean test` (27/27 passing), `mvn clean package`, and a live run
> (`java -jar target/backend-0.1.0.jar`) were all executed successfully, including exercising the
> `/api/auth/login` and `/api/schedules` endpoints against the seeded H2 data with real HTTP
> requests. Two dependency-version pins were required to build cleanly on a JDK 25 toolchain (the
> project still targets `java.version=21` and builds fine on 21 too): `lombok.version=1.18.48`
> (older Lombok can't patch JDK 25's compiler internals) and `mockito.version=5.23.0` plus an
> explicit `byte-buddy.version=1.18.14` override (Hibernate's transitively-pulled Byte Buddy 1.14.19
> otherwise wins Maven's nearest-wins mediation and can't instrument classes on JDK 25). An explicit
> `maven-compiler-plugin` block with `annotationProcessorPaths` was also added so Lombok's
> annotation processor is reliably invoked regardless of JDK/IDE defaults — without it, the plain
> `spring-boot-maven-plugin` exclude alone isn't sufficient on every toolchain, and all Lombok
> codegen (builders, getters/setters, `@Slf4j`) silently no-ops, which fails the build with "cannot
> find symbol" everywhere it's used. The React frontend's build, lint, unit tests and
> e2e are covered in the Frontend section below.

---

## Running the frontend

Requirements: Node 20.19+ (or 22+). The backend must be running first (`http://localhost:8080`).

```bash
cd frontend/busgo-ui
npm install
npm run dev        # http://localhost:5173
```

The API base URL defaults to `http://localhost:8080/api`; override with `VITE_API_URL`. The
backend's CORS config already allows any `http://localhost:*` origin.

This branch's frontend covers **Dev 6's scope only** (see [`docs/DEV6_SCOPE.md`](docs/DEV6_SCOPE.md)):
the **My Trips** page (active/cancelled bookings, filter tabs, cancel with confirmation) and the
**Confirm Booking** dialog. Login and the app shell are minimal placeholders marked
`TEMPORARY SHIM` in the source, to be replaced by Dev 1's real auth/Navbar. Search, seat selection
and the admin screens belong to Dev 2-5.

### Frontend checks

```bash
npm run build      # tsc --noEmit + vite build
npm run lint       # ESLint (typescript-eslint + react-hooks)
npm test           # Vitest + Testing Library: 22 tests (API client, Confirm Booking dialog, My Trips)
npm run e2e        # Playwright against the live backend: 7 specs (first time: npx playwright install chromium)
```

What the tests cover:
- `src/api/client.test.ts` -- Bearer token attached, the backend's `{message}` error shape surfaced,
  unreachable server / non-JSON errors / 204 handled.
- `src/features/booking/ConfirmBookingDialog.test.tsx` -- fare summary (seats x fare = total), the
  booking call and `onBooked`, **409 seat conflict** (reason shown, `onConflict` fired, dialog stays
  open), in-flight disabling, Escape / Go back.
- `src/features/my-trips/MyTripsPage.test.tsx` -- loading / empty / error+retry states, All / Active /
  Cancelled filters, cancel only offered for active *upcoming* trips (today counts), cancel flow
  and its failure paths (409 reload, 401 logout).
- `e2e/my-trips.spec.ts` -- against the real backend: anonymous redirect, empty state, list +
  cancel through the dialog (and the seats really freed server-side), keep-booking, form login, and
  booking through the dialog including a seat stolen mid-dialog.

---

## Seeded credentials & sample data

| Role      | Email               | Password   |
|-----------|----------------------|------------|
| Admin     | admin@busgo.com      | Admin@123  |

Register any new account through the UI/API for a regular passenger — new accounts always start
with `isAdmin = false`.

Seeded route for manual testing: **Hyderabad → Bangalore**, 3 days from server startup, 3 buses.

---

## API endpoints

All JSON. Base path `http://localhost:8080/api`.

| Method | Path                          | Auth         | Description                             |
|--------|-------------------------------|--------------|------------------------------------------|
| POST   | `/auth/register`              | Public       | Create a passenger account, returns JWT  |
| POST   | `/auth/login`                 | Public       | Returns JWT                              |
| POST   | `/auth/logout`                | Public       | 204 — stateless, client discards token   |
| GET    | `/schedules?from=&to=&date=`  | Public       | Search available schedules               |
| GET    | `/schedules/{id}/seats`       | Public       | Booked seat numbers for a schedule       |
| GET    | `/schedules/all`              | Admin        | List all schedules (admin management UI) |
| POST   | `/schedules`                  | Admin        | Create schedule                          |
| PUT    | `/schedules/{id}`             | Admin        | Update schedule                          |
| DELETE | `/schedules/{id}`             | Admin        | Delete schedule                          |
| GET    | `/buses`                      | Public       | List buses                               |
| GET    | `/buses/{id}`                 | Public       | Get one bus                              |
| POST   | `/buses`                      | Admin        | Create bus                               |
| PUT    | `/buses/{id}`                 | Admin        | Update bus                               |
| DELETE | `/buses/{id}`                 | Admin        | Delete bus                               |
| POST   | `/bookings`                   | Authenticated| Create booking `{scheduleId, seatNumbers[]}` |
| GET    | `/bookings/mine`              | Authenticated| Current user's bookings                  |
| PUT    | `/bookings/{id}/cancel`       | Owner/Admin  | Cancel a booking, frees the seats        |

A ready-to-import Postman collection covering all of the above is at
[`docs/BusGo.postman_collection.json`](docs/BusGo.postman_collection.json). Run "Login (Admin)"
or "Login (Passenger)" first — its test script stores the returned token into the collection's
`{{token}}` variable, which the other requests send automatically.

### Error response shape

Every error (validation, not-found, conflict, auth, unexpected) is returned in this consistent
shape via a global `@RestControllerAdvice`:

```json
{
  "timestamp": "2025-09-12T12:00:00Z",
  "path": "/api/bookings",
  "error": "CONFLICT",
  "message": "Seat(s) already booked: 1A"
}
```

The frontend's `apiFetch` client (`src/api/client.ts`) reads `message` from this shape and throws
it as an `ApiRequestError` (with the HTTP status), so components show the server's reason instead
of each implementing their own error parsing.

---

## Performance benchmark

The spec's NFR target (section 11) is API response ≤2s under light concurrent load (5–10
requests). Measured, not just assumed: `./scripts/benchmark.sh` runs Apache Bench against five
representative endpoints at those concurrency levels. Every request across every run succeeds (0
failures), and the worst-case p99 latency (login, which is intentionally slow — see below) is
253ms, still 8x under budget. Full numbers, methodology, and how to reproduce:
[`docs/PERFORMANCE.md`](docs/PERFORMANCE.md).

---

## Architecture notes

### JWT vs. session — trade-off

This project uses **stateless JWT** auth (Spring Security + `io.jsonwebtoken`) instead of
server-side sessions, per the assignment's chosen architecture. The trade-offs, as actually
relevant to this project:

- **Pros**: no server-side session store to scale/replicate (fits a REST API cleanly), the
  SPA can attach the token to every request from a single API client, and the backend
  stays fully stateless — any instance can validate any request with only the shared secret.
- **Cons**: **logout is a lie in the purest sense** — a JWT can't be server-side invalidated
  without adding a token blocklist (which reintroduces state). This app's `/auth/logout` endpoint
  is therefore just a 204 for API-shape completeness; the actual logout is the **client discarding
  the token** (the auth context's `logout()` clears it from state and `localStorage`). If a token
  leaks, it's valid until it expires (24h by default, `busgo.jwt.expiration-ms`), regardless of
  whether the user "logged out." A real production system needing hard revocation would need a
  short-lived access token + refresh token pattern, or a server-side denylist — both out of scope
  for this project's size.
- **Storage**: the frontend keeps the token in React auth state (source of truth for the running
  app) and mirrors it to `localStorage` purely so a page refresh doesn't log the user out. This is
  the well-known XSS-exposure trade-off of `localStorage` vs. an httpOnly cookie; acceptable here
  because there's no XSS-prone third-party content in this app, but worth naming as a known
  simplification for a training project rather than pretending it's production-hardened.

### DTOs, not entities, over the wire

Every controller returns/accepts DTOs (`AuthDtos`, `BusDtos`, `ScheduleDtos`, `BookingDtos`) —
JPA entities are never serialized directly, avoiding lazy-loading proxy leakage and letting the
API shape evolve independently of the schema.

### Seat conflict checking

There is no separate `Seat` table — a schedule's booked seats are derived by querying
`BookingSeat` rows joined through `Booking` where `status = BOOKED`
(`BookingSeatRepository.findBookedSeatNumbers`). `BookingService.createBooking` is
`@Transactional` and re-checks that set against the newly requested seat numbers immediately
before inserting, so a booking is rejected with `409 CONFLICT` (naming the exact conflicting
seats) if another booking claimed one of the requested seats first.

This check-then-insert is only safe against concurrent requests because `createBooking` loads the
schedule via `ScheduleRepository.findByIdForUpdate` (`SELECT ... FOR UPDATE`, a
`PESSIMISTIC_WRITE` lock), not a plain `findById`. Without that lock, two transactions can both
run the "is this seat free" read before either has committed its insert (a classic TOCTOU race
under the default READ_COMMITTED isolation both H2 and Postgres use) and both succeed, silently
double-booking the seat — this was verified empirically during development by firing 5–8 truly
concurrent booking requests at the same seat: without the lock, more than one request could win;
with it, exactly one always does and the rest get a clean `409`. There's still no seat-lock/TTL
("seat held for 5 minutes while you check out") — the spec explicitly says this isn't required at
this level, so two users can both view a seat as available and one will lose the race, but that
race is now genuinely resolved at commit time rather than merely hoped to be.

### Admin authorization

`isAdmin` is a plain boolean on `User`. Spring Security maps it to a `ROLE_ADMIN` authority
(`UserPrincipal.getAuthorities()`), and `SecurityConfig` requires that role for all
bus/schedule write endpoints (`hasRole("ADMIN")` on `/api/buses/**` and `/api/schedules/**`,
with narrower `permitAll()` carve-outs for the public GET search/seat-map/list endpoints declared
*before* those broader rules, since Spring Security matches in order). A non-admin JWT hitting an
admin-only endpoint gets `403 FORBIDDEN` in the standard error JSON shape (via a custom
`AccessDeniedHandler`), not a generic Spring error page. The frontend's admin route guard (Dev 2's scope) mirrors this
by hiding the Admin nav link and blocking `/admin` for non-admins — that's UX, not security; the real enforcement is server-side.

These rules are locked in by `AuthorizationRulesTest`, which drives every admin write route through the real
security filter chain as an anonymous caller (expects 401), a passenger (403) and the admin (allowed), and
checks the public reads stay public. It exists because an earlier version passed the string `"GET"` to
`requestMatchers(...)`, which Spring Security treats as a URL pattern, so `POST /api/buses` was open to
anyone. The matchers now use `HttpMethod.GET`.

---

## What was simplified / deliberately left as a known gap

These are all things the assignment spec explicitly allows or calls "optional" — listed here for
transparency rather than treated as accidental gaps:

- **No seat-lock TTL.** Concurrent booking races are resolved by rejecting the loser at commit
  time with a clear `409` naming the conflicting seats, not by holding a soft lock while someone
  browses.
- **No refresh tokens / server-side JWT revocation.** See the JWT-vs-session note above.
- **No Flyway/Liquibase migrations.** Schema is managed via `ddl-auto: update`, appropriate for
  this project's size; a real production app would want versioned migrations.
- **E2e tests are optional extras.** The spec waives them; the required testing deliverables are
  backend service-layer coverage (JUnit5/Mockito) and a few frontend unit tests. The Playwright
  specs and the real-database `BookingConcurrencyTest` go beyond that.
- **`mvn test` and `mvn spring-boot:run` have now been executed and verified** (see the backend
  section above) — the earlier gap noted here is closed.
- **Console logging only** (via Lombok `@Slf4j` / Spring Boot defaults), no external logging
  infrastructure, per the spec's NFRs.
- **Fare/seat numbering assumes a fixed 4-seats-per-row (A–D) layout** for every bus regardless of
  `busType` (SLEEPER buses in real life often have a different physical layout) — kept as a single
  10x4 grid for both types since the spec's wireframe calls for exactly that grid, not a
  per-bus-type layout.

---

## Generative AI usage

This project was built with **Claude (Anthropic)** as a pair-programmer, per the program's rubric
that rewards documented AI usage. Concretely, in this session:

- Claude scaffolded the entire backend (entities, repositories, DTOs, services, controllers,
  Spring Security + JWT configuration, the global exception handler, the seed data runner) and an
  initial Angular frontend from the assignment's written spec, in one continuous build session.
- Claude wrote the service-layer unit tests (JUnit5/Mockito), designed around the spec's
  explicitly called-out risk areas (seat-conflict logic, admin authorization, search filtering)
  rather than generated for coverage-percentage padding.
- For the team split (Dev 6: Booking & My Trips), the team chose React and the `com.busgo`
  package, so Claude rewrote the frontend as React + TypeScript for Dev 6's scope only (My Trips
  page, Confirm Booking dialog, API client, Vitest/Playwright tests) and added the real-database
  `BookingConcurrencyTest`. Claude also ran a security review that found two real issues (a
  check-then-insert seat double-booking race, and silent hardcoded prod secrets), both fixed and
  verified: the race by firing concurrent requests at one seat, and the concurrency test was
  checked by temporarily removing the lock and confirming it fails.
- Every architectural choice mentioned in this README (JWT trade-off, DTO-not-entity boundary,
  derived-seats-from-BookingSeat instead of a Seat table, transactional seat-conflict check) was
  made by Claude following the assignment's explicit spec, not invented independently — the spec
  document was the primary source of truth throughout.
- A human (the developer using this training program) directed the overall requirements, chose
  the tech stack (Spring Boot + JWT; React after the team's decision), and is responsible for reviewing, running, and
  ultimately owning this code before submission — this README's "known gaps" section exists so
  that review can start from an honest list rather than discovering issues cold.
