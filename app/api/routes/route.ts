import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { store } from '@/lib/data-store';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim();

    // 1. Try querying directly from Microsoft SQL Server Database
    try {
      let sqlQuery = `
        SELECT 
          r.id,
          r.route_code AS routeCode,
          r.route_name AS routeName,
          r.direction,
          r.description,
          COUNT(rs.id) AS stopCount
        FROM bus_routes r
        LEFT JOIN route_stops rs ON rs.route_id = r.id
        WHERE r.is_active = 1
      `;
      const params: any = {};

      if (search) {
        sqlQuery += ` AND (r.route_code LIKE @search OR r.route_name LIKE @search OR r.description LIKE @search)`;
        params.search = `%${search}%`;
      }

      sqlQuery += ` GROUP BY r.id, r.route_code, r.route_name, r.direction, r.description ORDER BY CAST(CASE WHEN r.route_code LIKE '[0-9]%' THEN r.route_code ELSE '999' END AS VARCHAR(20)), r.route_code`;

      const dbRoutes = await query<any>(sqlQuery, params);

      if (dbRoutes && dbRoutes.length > 0) {
        const data = dbRoutes.map((r) => {
          // Parse description helper fields if present
          let enterprise = '';
          let operatingHours = '';
          let price = '';
          let interval = '';
          let forwardPath = '';
          let backwardPath = '';

          if (r.description) {
            const entMatch = r.description.match(/Đơn vị vận hành:\s*([^\n]+)/);
            if (entMatch) enterprise = entMatch[1].trim();

            const hrMatch = r.description.match(/Thời gian hoạt động:\s*([^\n]+)/);
            if (hrMatch) operatingHours = hrMatch[1].trim();

            const prMatch = r.description.match(/Giá vé:\s*([^\n]+)/);
            if (prMatch) price = prMatch[1].trim();

            const intMatch = r.description.match(/Giãn cách:\s*([^\n]+)/);
            if (intMatch) interval = intMatch[1].trim();

            const fwdMatch = r.description.match(/【Chiều đi】:\s*([^\n]+)/);
            if (fwdMatch) forwardPath = fwdMatch[1].trim();

            const bwdMatch = r.description.match(/【Chiều về】:\s*([^\n]+)/);
            if (bwdMatch) backwardPath = bwdMatch[1].trim();
          }

          return {
            id: r.id,
            routeCode: r.routeCode,
            routeName: r.routeName,
            direction: r.direction,
            description: r.description,
            enterprise,
            operatingHours,
            price,
            interval,
            forwardPath,
            backwardPath,
            stopCount: r.stopCount || 0,
          };
        });

        return NextResponse.json(data);
      }
    } catch (dbErr: any) {
      console.warn('[API Routes] SQL Server direct query fallback to store:', dbErr.message);
    }

    // 2. Fallback to store if DB connection is unavailable
    let routes = store.bus_routes.filter((r) => r.is_active);

    if (search) {
      const q = search.toLowerCase();
      routes = routes.filter(
        (r) =>
          r.route_code.toLowerCase().includes(q) ||
          r.route_name.toLowerCase().includes(q) ||
          (r.description && r.description.toLowerCase().includes(q))
      );
    }

    const data = routes.map((r) => {
      const stopCount = store.route_stops.filter((rs) => rs.route_id === r.id).length;
      return {
        id: r.id,
        routeCode: r.route_code,
        routeName: r.route_name,
        direction: r.direction,
        description: r.description,
        enterprise: r.enterprise,
        operatingHours: r.operating_hours,
        price: r.price,
        interval: r.interval,
        forwardPath: r.forward_path,
        backwardPath: r.backward_path,
        stopCount,
      };
    });

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: err.message || 'Lỗi hệ thống' } },
      { status: 500 }
    );
  }
}
