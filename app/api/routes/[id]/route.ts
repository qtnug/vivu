import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { store } from '@/lib/data-store';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Try querying directly from Microsoft SQL Server Database
    try {
      const route = await queryOne<any>(
        `SELECT id, route_code AS routeCode, route_name AS routeName, direction, description, is_active 
         FROM bus_routes 
         WHERE (id = @id OR route_code = @id) AND is_active = 1`,
        { id }
      );

      if (route) {
        // Query ordered stops from SQL Server
        const dbStops = await query<any>(
          `SELECT 
             rs.id,
             rs.stop_id AS stopId,
             s.stop_name AS stopName,
             s.address,
             s.latitude,
             s.longitude,
             rs.stop_sequence AS stopSequence,
             rs.distance_from_start_km AS distanceFromStartKm
           FROM route_stops rs
           JOIN bus_stops s ON s.id = rs.stop_id
           WHERE rs.route_id = @routeId
           ORDER BY rs.stop_sequence ASC`,
          { routeId: route.id }
        );

        // Query schedules from SQL Server
        const dbSchedules = await query<any>(
          `SELECT 
             sc.id,
             CONVERT(VARCHAR(8), sc.departure_time) AS departureTime,
             sc.average_speed_kmh AS averageSpeedKmh,
             sc.days_of_week AS daysOfWeek,
             b.license_plate AS licensePlate
           FROM schedules sc
           LEFT JOIN buses b ON b.id = sc.bus_id
           WHERE sc.route_id = @routeId
           ORDER BY sc.departure_time ASC`,
          { routeId: route.id }
        );

        // Parse description helper fields
        let enterprise = '';
        let operatingHours = '';
        let price = '';
        let interval = '';
        let forwardPath = '';
        let backwardPath = '';

        if (route.description) {
          const entMatch = route.description.match(/Đơn vị vận hành:\s*([^\n]+)/);
          if (entMatch) enterprise = entMatch[1].trim();

          const hrMatch = route.description.match(/Thời gian hoạt động:\s*([^\n]+)/);
          if (hrMatch) operatingHours = hrMatch[1].trim();

          const prMatch = route.description.match(/Giá vé:\s*([^\n]+)/);
          if (prMatch) price = prMatch[1].trim();

          const intMatch = route.description.match(/Giãn cách:\s*([^\n]+)/);
          if (intMatch) interval = intMatch[1].trim();

          const fwdMatch = route.description.match(/【Chiều đi】:\s*([^\n]+)/);
          if (fwdMatch) forwardPath = fwdMatch[1].trim();

          const bwdMatch = route.description.match(/【Chiều về】:\s*([^\n]+)/);
          if (bwdMatch) backwardPath = bwdMatch[1].trim();
        }

        return NextResponse.json({
          id: route.id,
          routeCode: route.routeCode,
          routeName: route.routeName,
          direction: route.direction,
          description: route.description,
          enterprise,
          operatingHours,
          price,
          interval,
          forwardPath,
          backwardPath,
          stops: dbStops || [],
          schedules: dbSchedules || [],
        });
      }
    } catch (dbErr: any) {
      console.warn('[API Route Detail] SQL Server direct query fallback to store:', dbErr.message);
    }

    // 2. Fallback to in-memory store if DB is unreachable
    const route = store.bus_routes.find((r) => (r.id === id || r.route_code === id) && r.is_active);

    if (!route) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Tuyến xe buýt không tồn tại hoặc đã ngừng hoạt động' } },
        { status: 404 }
      );
    }

    // Get stops in ordered sequence
    const routeStops = store.route_stops
      .filter((rs) => rs.route_id === route.id)
      .sort((a, b) => a.stop_sequence - b.stop_sequence)
      .map((rs) => {
        const stop = store.bus_stops.find((s) => s.id === rs.stop_id);
        return {
          id: rs.id,
          stopId: rs.stop_id,
          stopName: stop?.stop_name || 'Trạm dừng',
          address: stop?.address || '',
          latitude: stop?.latitude || 0,
          longitude: stop?.longitude || 0,
          stopSequence: rs.stop_sequence,
          distanceFromStartKm: rs.distance_from_start_km,
        };
      });

    // Get schedules
    const schedules = store.schedules
      .filter((s) => s.route_id === route.id)
      .sort((a, b) => a.departure_time.localeCompare(b.departure_time))
      .map((s) => {
        const bus = s.bus_id ? store.buses.find((b) => b.id === s.bus_id) : null;
        return {
          id: s.id,
          departureTime: s.departure_time,
          averageSpeedKmh: s.average_speed_kmh,
          daysOfWeek: s.days_of_week,
          licensePlate: bus?.license_plate || null,
        };
      });

    return NextResponse.json({
      id: route.id,
      routeCode: route.route_code,
      routeName: route.route_name,
      direction: route.direction,
      description: route.description,
      enterprise: route.enterprise,
      operatingHours: route.operating_hours,
      price: route.price,
      interval: route.interval,
      forwardPath: route.forward_path,
      backwardPath: route.backward_path,
      stops: routeStops,
      schedules,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: err.message || 'Lỗi hệ thống' } },
      { status: 500 }
    );
  }
}
