import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiRequestError, TOKEN_KEY, apiFetch } from './client';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('apiFetch', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it('sends the stored JWT as a Bearer token and parses JSON', async () => {
    localStorage.setItem(TOKEN_KEY, 'abc.def.ghi');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse([{ id: 1 }]));
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiFetch('/bookings/mine')).resolves.toEqual([{ id: 1 }]);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/bookings\/mine$/);
    expect((init.headers as Headers).get('Authorization')).toBe('Bearer abc.def.ghi');
  });

  it('omits Authorization when logged out, and sets JSON content type on bodies', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}));
    vi.stubGlobal('fetch', fetchMock);

    await apiFetch('/bookings', { method: 'POST', body: '{}' });

    const headers = fetchMock.mock.calls[0][1].headers as Headers;
    expect(headers.get('Authorization')).toBeNull();
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it("surfaces the backend's structured error message and status", async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({ timestamp: 't', path: '/api/bookings', error: 'CONFLICT', message: 'Seat(s) already booked: 1A' }, 409),
      ),
    );

    const error = await apiFetch('/bookings').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiRequestError);
    expect(error).toMatchObject({ status: 409, message: 'Seat(s) already booked: 1A' });
  });

  it('falls back to a generic message when the error body is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('boom', { status: 500 })));

    await expect(apiFetch('/x')).rejects.toMatchObject({ status: 500, message: 'Request failed (500)' });
  });

  it('reports an unreachable server as status 0', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    await expect(apiFetch('/x')).rejects.toMatchObject({ status: 0, message: expect.stringContaining('backend') });
  });

  it('returns undefined for 204 No Content', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));

    await expect(apiFetch('/x', { method: 'DELETE' })).resolves.toBeUndefined();
  });
});
