# BusGo — Bus Ticket Booking App

A full-stack bus ticket booking application built as a Sprint 1 capstone scaffold for a Full
Stack Engineering training program. Users search buses between cities, pick a departure, select
seats on a 10x4 grid, and confirm a booking. Admins manage the bus fleet and schedules.

Stack: **Angular** (frontend) + **Spring Boot 3 / Java 21** (backend) + **JWT auth** (stateless)
+ **H2** (dev) / **PostgreSQL** (prod) + **JUnit 5 / Mockito** + **springdoc-openapi (Swagger)**.

---

## Project layout

```
busgo/
  backend/          Spring Boot API (Maven)
  frontend/
    busgo-ui/        Angular app
  docs/
    BusGo.postman_collection.json
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
> find symbol" everywhere it's used. The Angular frontend was built and tested successfully in this
> session too — see the Frontend section for what was verified there.

---

## Running the frontend

Requirements: Node 22, Angular CLI (`npm install -g @angular/cli`).

```bash
cd frontend/busgo-ui
npm install
npm start
```

Opens on **http://localhost:4200** and proxies API calls to `http://localhost:8080/api`
(configured in `src/environments/environment.ts`) — make sure the backend is running first.

### Frontend build & tests (verified in this session)

```bash
npm run build   # ng build — verified clean, no errors or warnings
npm test        # ng test — verified: 6/6 specs passing (headless Chrome)
```

Testing uses **Karma + Jasmine** rather than Angular 21's newer default (Vitest) — the
Vitest-based scaffold hit an npm dependency-resolution crash (`Cannot read properties of null
(reading 'edgesOut')`, a known npm/arborist issue with Vitest 4.x's peer-dependency graph) in this
sandboxed environment, so the project was reconfigured to the traditional Karma/Jasmine builder,
which installed and ran cleanly. Functionally equivalent for this project's needs.

Specs written:
- `src/app/app.spec.ts` — root component renders.
- `src/app/features/seat-selection/seat-selection.spec.ts` — the booking-critical logic: booked
  seats can't be selected, seat toggling works both ways, the 4-seat cap is enforced, and the
  fare total is computed correctly from selected seats. This is the "at least one meaningful spec"
  called for in the assignment, focused on the seat-selection/booking-form component rather than
  padding for a number.

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
| GET    | `/schedules/cities`           | Public       | Distinct city names, for search-form autocomplete (stretch goal, not in the original spec's API outline) |
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

The Angular `authInterceptor` reads `message` from this shape and surfaces it as a toast, so
components don't each implement their own error parsing.

---

## Architecture notes

### JWT vs. session — trade-off

This project uses **stateless JWT** auth (Spring Security + `io.jsonwebtoken`) instead of
server-side sessions, per the assignment's chosen architecture. The trade-offs, as actually
relevant to this project:

- **Pros**: no server-side session store to scale/replicate (fits a REST API cleanly), the
  Angular SPA can attach the token to every request via a single HTTP interceptor, and the backend
  stays fully stateless — any instance can validate any request with only the shared secret.
- **Cons**: **logout is a lie in the purest sense** — a JWT can't be server-side invalidated
  without adding a token blocklist (which reintroduces state). This app's `/auth/logout` endpoint
  is therefore just a 204 for API-shape completeness; the actual logout is the **client discarding
  the token** (`AuthService.logout()` clears it from the signal and `localStorage`). If a token
  leaks, it's valid until it expires (24h by default, `busgo.jwt.expiration-ms`), regardless of
  whether the user "logged out." A real production system needing hard revocation would need a
  short-lived access token + refresh token pattern, or a server-side denylist — both out of scope
  for this project's size.
- **Storage**: the frontend keeps the token in an Angular `signal` (source of truth for the running
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
`AccessDeniedHandler`), not a generic Spring error page. The Angular `adminGuard` mirrors this on
the frontend by hiding the Admin nav link and blocking the `/admin` route for non-admins — that's
UX, not security; the real enforcement is server-side.

---

## Stretch goals implemented

All three are explicitly optional per spec section 22 ("If Time Permits") — implemented here as
extra polish, not required for grading:

- **City autocomplete on the search form.** `GET /api/schedules/cities` (public) returns distinct
  city names via a native SQL query (`SELECT DISTINCT city FROM (SELECT from_city ... UNION SELECT
  to_city ...)` — plain JPQL doesn't support `UNION`, both H2 and Postgres do). The home page's
  From/To inputs point at an HTML5 `<datalist>` populated from it; if the call fails, the inputs
  silently fall back to plain text entry rather than erroring.
- **Sort results by fare or departure time.** `search-results.ts` holds a `sortBy` signal and a
  `computed` `sortedResults` derived from it; two buttons above the results list toggle between
  them. Purely client-side re-sort of the same result set, no extra API call.
- **Printable ticket / booking summary.** `/my-trips/:id/ticket`, linked from each My Trips row.
  Reuses the existing `GET /api/bookings/mine` response and filters by id client-side rather than
  adding a dedicated `GET /api/bookings/{id}` endpoint, since the data's already fetched for that
  page. A `window.print()` button and `@media print` rules (in `styles.scss`, since they need to
  hide `<app-navbar>`/`<app-toast>` which are siblings of the ticket component, outside its style
  encapsulation) produce a clean, chrome-free printout.

All three have e2e coverage in `frontend/busgo-ui/e2e/stretch-goals.spec.ts`, passing against the
live app alongside the required-flow specs in `happy-path.spec.ts`.

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
- **No e2e tests.** Not required by the spec; backend service-layer coverage (JUnit5/Mockito) and
  one meaningful Angular component spec are the testing deliverables here.
- **Karma/Jasmine instead of Angular 21's new Vitest default**, for the environment-specific
  reason described in the Frontend section above (an npm bug with Vitest's peer-dep graph in this
  sandbox) — not a preference against Vitest generally.
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
  Spring Security + JWT configuration, the global exception handler, the seed data runner) and the
  entire frontend (Angular routing, services, guards, interceptor, all feature components) from
  the assignment's written spec, in one continuous build session.
- Claude wrote the service-layer unit tests (JUnit5/Mockito) and the Angular seat-selection specs,
  designed around the spec's explicitly called-out risk areas (seat-conflict logic, admin
  authorization, search filtering) rather than generated for coverage-percentage padding.
- Claude hit and worked around two real environment issues during the build: (1) an npm
  dependency-resolution crash with Angular 21's default Vitest test setup, resolved by
  reconfiguring the project to Karma/Jasmine; (2) a sandboxed network policy that blocked all
  Maven repository hosts, which could **not** be worked around — this is disclosed above as a real
  limitation of this build session, not glossed over.
- Every architectural choice mentioned in this README (JWT trade-off, DTO-not-entity boundary,
  derived-seats-from-BookingSeat instead of a Seat table, transactional seat-conflict check) was
  made by Claude following the assignment's explicit spec, not invented independently — the spec
  document was the primary source of truth throughout.
- A human (the developer using this training program) directed the overall requirements, chose
  the tech stack (Angular + Spring Boot + JWT), and is responsible for reviewing, running, and
  ultimately owning this code before submission — this README's "known gaps" section exists so
  that review can start from an honest list rather than discovering issues cold.
