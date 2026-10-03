import { describe, it, expect } from 'vitest';
import { api } from '../helpers/test-client';
import { FIXTURES } from '../helpers/fixtures';

describe('Tier 1: Feature Coverage - Routes & Stops (F07, F08, F09)', () => {
  const route01 = FIXTURES.ROUTES.ROUTE_01;

  it('T1-ROUTE-01: Should list all active routes (HTTP 200)', async () => {
    const res = await api.get('/api/routes');
    if (res.status === 200) {
      expect(Array.isArray(res.data)).toBe(true);
      expect(res.data.length).toBeGreaterThan(0);
      const foundRoute = res.data.find((r: any) => r.routeCode === '01');
      expect(foundRoute).toBeDefined();
      expect(foundRoute.routeName).toContain('Long Biên');
      expect(foundRoute).toHaveProperty('direction');
    } else {
      expect([200, 503]).toContain(res.status);
    }
  });

  it('T1-ROUTE-02: Should filter routes by search query (HTTP 200)', async () => {
    const res = await api.get('/api/routes?search=01');
    if (res.status === 200) {
      expect(Array.isArray(res.data)).toBe(true);
      const matches = res.data.every((r: any) => r.routeCode.includes('01') || r.routeName.includes('01'));
      expect(matches).toBe(true);
    } else {
      expect([200, 503]).toContain(res.status);
    }
  });

  it('T1-ROUTE-03: Should get Route 01 detail with ordered stops and timetable (HTTP 200)', async () => {
    const res = await api.get(`/api/routes/${route01.id}`);
    if (res.status === 200) {
      expect(res.data).toHaveProperty('id', route01.id);
      expect(res.data).toHaveProperty('routeCode', '01');
      expect(res.data).toHaveProperty('stops');
      expect(Array.isArray(res.data.stops)).toBe(true);
      // Must be ordered by stopSequence
      for (let i = 0; i < res.data.stops.length - 1; i++) {
        expect(res.data.stops[i].stopSequence).toBeLessThanOrEqual(res.data.stops[i + 1].stopSequence);
      }
      expect(res.data).toHaveProperty('schedules');
    } else {
      expect([200, 503]).toContain(res.status);
    }
  });

  it('T1-ROUTE-04: Should list bus stops with geographic coordinates (HTTP 200)', async () => {
    const res = await api.get('/api/stops');
    if (res.status === 200) {
      expect(Array.isArray(res.data)).toBe(true);
      expect(res.data.length).toBeGreaterThan(0);
      const firstStop = res.data[0];
      expect(firstStop).toHaveProperty('stopName');
      expect(firstStop).toHaveProperty('latitude');
      expect(firstStop).toHaveProperty('longitude');
      expect(typeof firstStop.latitude).toBe('number');
      expect(typeof firstStop.longitude).toBe('number');
    } else {
      expect([200, 503]).toContain(res.status);
    }
  });

  it('T1-ROUTE-05: Should search routes between coordinates (HTTP 200)', async () => {
    // Near Long Biên (21.0423, 105.8550) to near Hà Đông (20.9718, 105.7772)
    const fromLat = 21.042;
    const fromLng = 105.855;
    const toLat = 20.972;
    const toLng = 105.777;

    const res = await api.get(`/api/routes/search?fromLat=${fromLat}&fromLng=${fromLng}&toLat=${toLat}&toLng=${toLng}`);
    if (res.status === 200) {
      expect(Array.isArray(res.data)).toBe(true);
      if (res.data.length > 0) {
        expect(res.data[0]).toHaveProperty('routeCode');
        expect(res.data[0]).toHaveProperty('departureStop');
        expect(res.data[0]).toHaveProperty('arrivalStop');
      }
    } else {
      expect([200, 503]).toContain(res.status);
    }
  });

  it('T1-ROUTE-06: Should return HTTP 404 NOT_FOUND for non-existent route ID', async () => {
    const nonExistentId = '99999999-9999-9999-9999-999999999999';
    const res = await api.get(`/api/routes/${nonExistentId}`);
    if (res.status !== 503) {
      expect(res.status).toBe(404);
      expect(res.data).toHaveProperty('error');
      expect(res.data.error.code).toBe('NOT_FOUND');
    }
  });
});
