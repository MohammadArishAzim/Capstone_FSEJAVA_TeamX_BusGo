# Performance benchmark

The spec's NFR section (§11) sets two targets: API response ≤2s under light load, and correctness
under 5–10 concurrent requests, explicitly allowing Postman Runner or multiple browser tabs rather
than a dedicated load-testing tool. This benchmark uses Apache Bench (`ab`, ships with macOS and
most Linux distros) instead, purely because it produces reproducible numbers automatically rather
than requiring a person to run Postman Runner and read timings off the UI by hand — the intent
("prove it's fast enough, don't over-engineer the proof") is the same.

## How to reproduce

```bash
cd backend && mvn spring-boot:run   # start the app first, separate terminal
./scripts/benchmark.sh
```

`scripts/benchmark.sh` hits five representative endpoints (a public search, a public list, an
authenticated read, and the login endpoint) at the spec's 5 and 10 concurrency levels.

## Results (measured on this machine: Apple Silicon Mac, JDK 25, Spring Boot 4.1.1, H2 in-memory dev profile)

All numbers in milliseconds unless noted. **Every single request across every run succeeded (0
failures)**, and every p99 is well under the 2,000ms target — the closest any endpoint gets is
login at 286ms, still about 7x under budget.

| Endpoint | Concurrency | Requests | Mean | p50 | p95 | p99 | Req/sec |
|---|---|---|---|---|---|---|---|
| `GET /api/schedules` (search) | 5 | 100 | ~13ms | 5 | 9 | 157* | 377 |
| `GET /api/schedules` (search) | 10 | 200 | ~7ms | 6 | 13 | 18 | 1437 |
| `GET /api/buses` | 10 | 200 | ~4ms | 3 | 6 | 11 | 2720 |
| `POST /api/auth/login` | 5 | 50 | ~119ms | 90 | 97 | 286* | 42 |
| `GET /api/bookings/mine` (authenticated) | 10 | 100 | ~8ms | 5 | 8 | 34 | 1202 |

\* A single outlier request (JIT warmup / first-request-after-idle on a freshly started JVM) pulls
the p99 up on otherwise-fast runs; p50/p95 are the more representative numbers for steady-state
behavior.

## Notes

- **Login is the slowest endpoint by design, not by accident.** BCrypt is deliberately
  computationally expensive (that's the entire point of using it over a fast hash like SHA-256,
  which would make brute-forcing leaked password hashes cheap) — the ~119ms mean (p50 90ms) reflects the
  password-verification cost, not an inefficiency to fix.
- **These numbers are against H2 in-memory**, which is faster than Postgres would be over a real
  network connection; they're a ceiling on what's achievable locally, not a guarantee for a
  networked Postgres deployment. Still, the margin to the 2s target (about 7x even for login's worst-case p99) leaves
  substantial headroom for that difference.
- **Concurrency correctness, not just latency, was also verified separately**: see the README's
  "Seat conflict checking" section for the seat-booking race-condition fix, which was verified with
  5-8 genuinely concurrent booking requests for the same seat (exactly one always wins, the rest get
  a clean `409`) — the NFR's "5-10 concurrent requests" target is about both speed and correctness
  under concurrency, and this benchmark only covers the speed half.
