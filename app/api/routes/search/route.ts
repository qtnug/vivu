import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/data-store';

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fromLat = searchParams.get('fromLat') ? parseFloat(searchParams.get('fromLat')!) : null;
    const fromLng = searchParams.get('fromLng') ? parseFloat(searchParams.get('fromLng')!) : null;
    const toLat = searchParams.get('toLat') ? parseFloat(searchParams.get('toLat')!) : null;
    const toLng = searchParams.get('toLng') ? parseFloat(searchParams.get('toLng')!) : null;
    const query = searchParams.get('q')?.toLowerCase();

    // Text search fallback or coordinate-based routing
    if (query) {
      const matchedStops = store.bus_stops.filter(
        (s) => s.stop_name.toLowerCase().includes(query) || (s.address && s.address.toLowerCase().includes(query))
      );
      return NextResponse.json({
        stops: matchedStops,
      });
    }

    if (fromLat === null || fromLng === null || toLat === null || toLng === null) {
      // Return popular route recommendations if no coords provided
      const defaultRoutes = store.bus_routes.slice(0, 3).map((r) => ({
        routeId: r.id,
        routeCode: r.route_code,
        routeName: r.route_name,
        estimatedDurationMinutes: 35,
        estimatedDistanceKm: 12.6,
      }));
      return NextResponse.json(defaultRoutes);
    }

    // Match closest origin stop (< 1.5km) and destination stop
    const stopsWithOriginDistance = store.bus_stops.map((s) => ({
      stop: s,
      distance: calculateDistanceKm(fromLat, fromLng, s.latitude, s.longitude),
    })).sort((a, b) => a.distance - b.distance);

    const stopsWithDestDistance = store.bus_stops.map((s) => ({
      stop: s,
      distance: calculateDistanceKm(toLat, toLng, s.latitude, s.longitude),
    })).sort((a, b) => a.distance - b.distance);

    const originStop = stopsWithOriginDistance[0]?.stop;
    const destStop = stopsWithDestDistance[0]?.stop;

    const matchedRoutes: any[] = [];

    if (originStop && destStop) {
      for (const route of store.bus_routes.filter((r) => r.is_active)) {
        const routeStops = store.route_stops.filter((rs) => rs.route_id === route.id);
        const originRS = routeStops.find((rs) => rs.stop_id === originStop.id);
        const destRS = routeStops.find((rs) => rs.stop_id === destStop.id);

        if (originRS && destRS && originRS.stop_sequence < destRS.stop_sequence) {
          const tripDistanceKm = Math.abs(destRS.distance_from_start_km - originRS.distance_from_start_km);
          const schedule = store.schedules.find((s) => s.route_id === route.id);
          const speed = schedule?.average_speed_kmh || 18.5;
          const durationMinutes = Math.round((tripDistanceKm / speed) * 60);

          matchedRoutes.push({
            routeId: route.id,
            routeCode: route.route_code,
            routeName: route.route_name,
            originStop: {
              id: originStop.id,
              name: originStop.stop_name,
              sequence: originRS.stop_sequence,
            },
            destinationStop: {
              id: destStop.id,
              name: destStop.stop_name,
              sequence: destRS.stop_sequence,
            },
            tripDistanceKm,
            estimatedDurationMinutes: durationMinutes,
          });
        }
      }
    }

    return NextResponse.json(matchedRoutes);
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: err.message || 'Lỗi hệ thống' } },
      { status: 500 }
    );
  }
}
