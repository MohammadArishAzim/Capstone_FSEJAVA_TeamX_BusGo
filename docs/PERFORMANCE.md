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

## Results (measured on this machine: Apple Silicon Mac, JDK 25, H2 in-memory dev profile)

All numbers in milliseconds unless noted. **Every single request across every run succeeded (0
failures)**, and every p99 is well under the 2,000ms target — the closest any endpoint gets is
login at 253ms, still 8x under budget.

| Endpoint | Concurrency | Requests | Mean | p50 | p95 | p99 | Req/sec |
|---|---|---|---|---|---|---|---|
| `GET /api/schedules` (search) | 5 | 100 | ~9ms | 6 | 14 | 99* | 423 |
| `GET /api/schedules` (search) | 10 | 200 | ~8ms | 7 | 13 | 18 | 1209 |
| `GET /api/buses` | 10 | 200 | ~4ms | 2 | 6 | 19 | 2809 |
| `POST /api/auth/login` | 5 | 50 | ~90ms | 94 | 103 | 253* | 42 |
| `GET /api/bookings/mine` (authenticated) | 10 | 100 | ~10ms | 7 | 12 | 29 | 1002 |

\* A single outlier request (JIT warmup / first-request-after-idle on a freshly started JVM) pulls
the p99 up on otherwise-fast runs; p50/p95 are the more representative numbers for steady-state
behavior.

## Notes

- **Login is the slowest endpoint by design, not by accident.** BCrypt is deliberately
  computationally expensive (that's the entire point of using it over a fast hash like SHA-256,
  which would make brute-forcing leaked password hashes cheap) — the ~90ms mean reflects the
  password-verification cost, not an inefficiency to fix.
- **These numbers are against H2 in-memory**, which is faster than Postgres would be over a real
  network connection; they're a ceiling on what's achievable locally, not a guarantee for a
  networked Postgres deployment. Still, the margin to the 2s target (over 20x even for login) leaves
  substantial headroom for that difference.
- **Concurrency correctness, not just latency, was also verified separately**: see the README's
  "Seat conflict checking" section for the seat-booking race-condition fix, which was verified with
  5-8 genuinely concurrent booking requests for the same seat (exactly one always wins, the rest get
  a clean `409`) — the NFR's "5-10 concurrent requests" target is about both speed and correctness
  under concurrency, and this benchmark only covers the speed half.
