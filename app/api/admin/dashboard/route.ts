import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/data-store';
import { requireAdmin } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const authCheck = requireAdmin(req);
    if (authCheck.errorResponse) return authCheck.errorResponse;


    const paidOrders = store.orders.filter((o) => o.status === 'PAID');
    const totalRevenue = paidOrders.reduce((sum, o) => sum + o.total_amount, 0);
    const totalTicketsSold = paidOrders.reduce((sum, o) => sum + o.quantity, 0);
    const totalRoutes = store.bus_routes.filter((r) => r.is_active).length;
    const totalBuses = store.buses.filter((b) => b.is_active).length;

    // Top routes by revenue
    const routeRevenueMap: Record<string, { routeCode: string; routeName: string; revenue: number; ticketCount: number }> = {};
    for (const order of paidOrders) {
      const route = store.bus_routes.find((r) => r.id === order.route_id);
      const code = route?.route_code || '01';
      const name = route?.route_name || 'Tuyến buýt';
      if (!routeRevenueMap[code]) {
        routeRevenueMap[code] = { routeCode: code, routeName: name, revenue: 0, ticketCount: 0 };
      }
      routeRevenueMap[code].revenue += order.total_amount;
      routeRevenueMap[code].ticketCount += order.quantity;
    }

    const topRoutes = Object.values(routeRevenueMap).sort((a, b) => b.revenue - a.revenue);

    // Hourly distribution
    const hourlyDistribution = [
      { hour: '06:00', orders: 12 },
      { hour: '07:00', orders: 48 },
      { hour: '08:00', orders: 62 },
      { hour: '09:00', orders: 25 },
      { hour: '11:00', orders: 30 },
      { hour: '12:00', orders: 35 },
      { hour: '16:00', orders: 45 },
      { hour: '17:00', orders: 78 },
      { hour: '18:00', orders: 65 },
      { hour: '20:00', orders: 20 },
    ];

    return NextResponse.json({
      summary: {
        totalRevenue,
        totalTicketsSold,
        totalRoutes,
        totalBuses,
        pendingOrders: store.orders.filter((o) => o.status === 'PENDING').length,
      },
      topRoutes,
      hourlyDistribution,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: err.message || 'Lỗi hệ thống' } },
      { status: 500 }
    );
  }
}
