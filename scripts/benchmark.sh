#!/usr/bin/env bash
# Benchmarks BusGo's API against the spec's NFR targets (section 11): API response
# <=2s, and correctness under 5-10 concurrent requests. Uses Apache Bench (ab),
# which ships with macOS/most Linux distros -- the spec explicitly says no
# JMeter/dedicated load-testing tool is required at this level.
#
# Usage: start the backend first (mvn spring-boot:run, or run the packaged jar),
# then: ./scripts/benchmark.sh
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8080}"
# Matches the seeded Hyderabad -> Bangalore route (DataSeeder seeds it 3 days out
# from whenever the app started); override via SEARCH_DATE if your server has
# been running long enough that this has drifted into the past.
SEARCH_DATE="${SEARCH_DATE:-$(date -v+3d +%Y-%m-%d 2>/dev/null || date -d '+3 days' +%Y-%m-%d)}"

if ! command -v ab >/dev/null 2>&1; then
  echo "Apache Bench (ab) not found. On macOS it ships with the OS; on Debian/Ubuntu: apt install apache2-utils" >&2
  exit 1
fi

login_body=$(mktemp)
trap 'rm -f "$login_body"' EXIT
echo '{"email":"admin@busgo.com","password":"Admin@123"}' > "$login_body"

echo "=== GET /api/schedules (search), concurrency=5, n=100 ==="
ab -n 100 -c 5 "${BASE_URL}/api/schedules?from=Hyderabad&to=Bangalore&date=${SEARCH_DATE}"

echo
echo "=== GET /api/schedules (search), concurrency=10, n=200 ==="
ab -n 200 -c 10 "${BASE_URL}/api/schedules?from=Hyderabad&to=Bangalore&date=${SEARCH_DATE}"

echo
echo "=== GET /api/buses, concurrency=10, n=200 ==="
ab -n 200 -c 10 "${BASE_URL}/api/buses"

echo
echo "=== POST /api/auth/login (BCrypt hashing -- expect the slowest endpoint by design), concurrency=5, n=50 ==="
ab -n 50 -c 5 -p "$login_body" -T application/json "${BASE_URL}/api/auth/login"

echo
echo "=== GET /api/bookings/mine (authenticated), concurrency=10, n=100 ==="
token=$(curl -s -X POST "${BASE_URL}/api/auth/login" -H "Content-Type: application/json" -d @"$login_body" | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
ab -n 100 -c 10 -H "Authorization: Bearer ${token}" "${BASE_URL}/api/bookings/mine"
