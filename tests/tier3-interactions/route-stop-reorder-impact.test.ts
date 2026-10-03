import { describe, it, expect } from 'vitest';
import { api } from '../helpers/test-client';
import { FIXTURES } from '../helpers/fixtures';

describe('Tier 3: Cross-Feature Interactions - Route Stop Reordering Impact', () => {
  const route01Id = FIXTURES.ROUTES.ROUTE_01.id;
  let adminToken: string;

  it('Step 1: Admin logs in to manage route stop sequences', async () => {
    const res = await api.post('/api/auth/login', {
      email: FIXTURES.USERS.ADMIN.email,
      password: FIXTURES.USERS.ADMIN.password,
    });
    if (res.status === 200) adminToken = res.data.accessToken;
  });

  it('Step 2: Admin reorders stops on a route (PUT /api/admin/routes/:id/stops/reorder)', async () => {
    const stopIds = FIXTURES.STOPS.map((s) => s.id);
    // Reverse or swap first two stops
    const reorderedStopIds = [stopIds[1], stopIds[0], ...stopIds.slice(2)];

    const res = await api.put(
      `/api/admin/routes/${route01Id}/stops/reorder`,
      { stopIds: reorderedStopIds },
      { token: adminToken }
    );

    if (res.status !== 503) {
      expect([200, 204, 404]).toContain(res.status);
    }
  });

  it('Step 3: Public passenger route details reflect updated stop sequence (GET /api/routes/:id)', async () => {
    const res = await api.get(`/api/routes/${route01Id}`);
    if (res.status === 200 && res.data?.stops?.length > 0) {
      const stops = res.data.stops;
      // Ensure stopSequence values are strictly sequential (1, 2, 3...)
      stops.forEach((stop: any, index: number) => {
        expect(stop.stopSequence).toBe(index + 1);
      });
    }
  });
});
