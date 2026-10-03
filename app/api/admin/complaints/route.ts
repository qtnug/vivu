import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/data-store';
import { requireAdmin } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const authCheck = requireAdmin(req);
  if (authCheck.errorResponse) return authCheck.errorResponse;

  const result = store.complaints.map((c) => {
    const user = c.user_id ? store.users.find((u) => u.id === c.user_id) : null;
    const route = c.route_id ? store.bus_routes.find((r) => r.id === c.route_id) : null;
    return {
      ...c,
      userName: user?.full_name || 'Khách vãng lai',
      userEmail: user?.email || '',
      routeName: route ? `${route.route_code} - ${route.route_name}` : null,
    };
  });
  return NextResponse.json(result);
}
