import { NextRequest, NextResponse } from 'next/server';
import { getPlaceDetail, geocodeAddress, calculateDistanceMeters, Coordinates } from '@/lib/goong';
import { store } from '@/lib/data-store';
import hanoiStops from '@/lib/hanoi-stops.json';

// Common known transfer hubs in Hanoi
const MAJOR_HUBS = [
  'long biên',
  'cầu giấy',
  'kim mã',
  'hào nam',
  'mỹ đình',
  'chương dương',
  'cát linh',
  'giáp bát',
  'yên nghĩa',
  'ngã tư sở',
  'trần khánh dư',
  'lê duẩn',
  'nguyễn trãi',
  'gia lâm',
  'nguyễn văn cừ',
  'trần nhật duật',
  'khuất duy tiến',
];

const DISTRICT_NAMES = [
  'long biên', 'cầu giấy', 'đống đa', 'ba đình', 'hai bà trưng',
  'thanh xuân', 'tây hồ', 'hoàng mai', 'nam từ liêm', 'bắc từ liêm',
  'hà đông', 'hoàn kiếm', 'gia lâm', 'đông anh', 'sóc sơn',
  'thanh trì', 'hoài đức', 'thường tín', 'đan phượng', 'mê linh'
];

const STOP_WORDS = [
  'việt nam', 'vietnam', 'viet nam', 'hà nội', 'ha noi', 'thành phố', 'tỉnh', 'quốc gia', 'quận', 'huyện', 'thị xã'
];

// Neighborhood and street synonyms in Hanoi
const LOCAL_NEIGHBORHOOD_SYNONYMS: Record<string, string[]> = {
  'trường lâm': ['trường lâm', 'bệnh viện đa khoa đức giang', 'đức giang', 'ngô gia tự', 'việt hưng', 'vạn hạnh', 'lưu khánh đàm', 'nguyễn cao luyện'],
  'hoàng quán chi': ['hoàng quán chi', 'viện huyết học', 'dương đình nghệ', 'tổng cục hải quan', 'thành thái', 'tôn thất thuyết', 'công viên cầu giấy', 'trung kính', 'yên hòa', 'yên hoà', 'keangnam', 'mễ trì'],
  'bến xe gia lâm': ['bến xe gia lâm', 'ngô gia khảm', 'nguyễn văn cừ', 'ngọc lâm'],
  'bến xe mỹ đình': ['bến xe mỹ đình', 'phạm hùng', 'tôn thất thuyết', 'nguyễn hoàng'],
  'bến xe giáp bát': ['bến xe giáp bát', 'giải phóng', 'kim đồng'],
  'bến xe yên nghĩa': ['bến xe yên nghĩa', 'quang trung', 'ba la', 'quốc lộ 6'],
  'nội bài': ['sân bay nội bài', 'nhà ga t1', 'nhà ga t2', 'võ nguyên giáp'],
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { from, to, fromPlaceId, toPlaceId, fromCoords, toCoords } = body;

    if (!from && !fromCoords) {
      return NextResponse.json({ error: { message: 'Vui lòng nhập điểm đi' } }, { status: 400 });
    }
    if (!to && !toCoords) {
      return NextResponse.json({ error: { message: 'Vui lòng nhập điểm đến' } }, { status: 400 });
    }

    // 1. Geocode Origin
    let originLocation: Coordinates | null = null;
    let originName = from || 'Điểm đi';
    let originAddress = '';

    if (fromCoords && typeof fromCoords.lat === 'number') {
      originLocation = fromCoords;
    } else if (fromPlaceId?.startsWith('stop_')) {
      const stopNameDecoded = decodeURIComponent(fromPlaceId.split('_').slice(2).join('_'));
      originName = stopNameDecoded || from;
    } else if (fromPlaceId) {
      const detail = await getPlaceDetail(fromPlaceId);
      if (detail) {
        originLocation = detail.coordinates;
        originName = detail.name || from;
        originAddress = detail.address;
      }
    }

    if (!originLocation && from) {
      const queryAddr = from.includes('Hà Nội') ? from : `${from}, Hà Nội`;
      const geo = await geocodeAddress(queryAddr);
      if (geo) {
        originLocation = { lat: geo.lat, lng: geo.lng };
        if (geo.formattedAddress) originAddress = geo.formattedAddress;
      }
    }

    // 2. Geocode Destination
    let destLocation: Coordinates | null = null;
    let destName = to || 'Điểm đến';
    let destAddress = '';

    if (toCoords && typeof toCoords.lat === 'number') {
      destLocation = toCoords;
    } else if (toPlaceId?.startsWith('stop_')) {
      const stopNameDecoded = decodeURIComponent(toPlaceId.split('_').slice(2).join('_'));
      destName = stopNameDecoded || to;
    } else if (toPlaceId) {
      const detail = await getPlaceDetail(toPlaceId);
      if (detail) {
        destLocation = detail.coordinates;
        destName = detail.name || to;
        destAddress = detail.address;
      }
    }

    if (!destLocation && to) {
      const queryAddr = to.includes('Hà Nội') ? to : `${to}, Hà Nội`;
      const geo = await geocodeAddress(queryAddr);
      if (geo) {
        destLocation = { lat: geo.lat, lng: geo.lng };
        if (geo.formattedAddress) destAddress = geo.formattedAddress;
      }
    }

    // 3. Extract keywords from address strings with specificity weighting & neighborhood synonyms
    const extractKeywords = (str: string, fullAddr: string) => {
      const queryText = (str || '').toLowerCase();
      const specificKeywords: string[] = [];
      const broadKeywords: string[] = [];

      // If user explicitly searched a major hub or station name
      for (const hub of MAJOR_HUBS) {
        if (queryText.includes(hub)) {
          specificKeywords.push(hub);
        }
      }

      // Check if user explicitly searched a district name
      for (const d of DISTRICT_NAMES) {
        if (queryText.includes(d)) {
          specificKeywords.push(d);
        }
      }

      const clean = (fullAddr ? fullAddr : str)
        .toLowerCase()
        .replace(/số \d+/g, '')
        .replace(/ngõ \d+/g, '')
        .replace(/ngách \d+/g, '')
        .replace(/\b\d{4,6}\b/g, '')
        .trim();

      const parts = clean.split(/[,;\-\/]+/).map((p) => p.trim()).filter((p) => p.length > 2);
      for (const p of parts) {
        if (STOP_WORDS.some((w) => p === w || p.includes(w))) continue;

        const streetClean = p.replace(/bến xe|điểm trung chuyển|phường|xã|đường|phố|quận|huyện|thị xã/g, '').trim();
        if (streetClean.length > 2 && !STOP_WORDS.includes(streetClean)) {
          if (DISTRICT_NAMES.includes(streetClean)) {
            broadKeywords.push(streetClean);
          } else {
            specificKeywords.push(streetClean);
            // Check synonyms
            for (const [key, syns] of Object.entries(LOCAL_NEIGHBORHOOD_SYNONYMS)) {
              if (streetClean.includes(key) || key.includes(streetClean)) {
                specificKeywords.push(...syns);
              }
            }
          }
        }
      }

      return {
        specific: [...new Set(specificKeywords)].filter((k) => k.length > 2 && !STOP_WORDS.includes(k)),
        broad: [...new Set(broadKeywords)].filter((k) => k.length > 2),
      };
    };

    const originKw = extractKeywords(from || '', originAddress);
    const destKw = extractKeywords(to || '', destAddress);

    // 4. Find candidate routes for Origin and Destination
    const scoreRoute = (r: any, kw: { specific: string[]; broad: string[] }) => {
      const text = `${r.route_name} ${r.forward_path || ''} ${r.backward_path || ''}`.toLowerCase();
      let spec = 0;
      let broad = 0;
      for (const k of kw.specific) {
        if (text.includes(k)) spec += 10;
      }
      for (const k of kw.broad) {
        if (text.includes(k)) broad += 2;
      }
      return { total: spec + broad, spec, broad };
    };

    const originScoredRoutes = store.bus_routes
      .map((r) => {
        const sc = scoreRoute(r, originKw);
        return { route: r, ...sc };
      })
      .filter((item) => item.total > 0)
      .sort((a, b) => b.total - a.total);

    const destScoredRoutes = store.bus_routes
      .map((r) => {
        const sc = scoreRoute(r, destKw);
        return { route: r, ...sc };
      })
      .filter((item) => item.total > 0)
      .sort((a, b) => b.total - a.total);

    // Filter candidate routes (prefer specific matches)
    const originSpecificRoutes = originScoredRoutes.filter((i) => i.spec > 0).map((i) => i.route);
    const destSpecificRoutes = destScoredRoutes.filter((i) => i.spec > 0).map((i) => i.route);

    const originCandidateRoutes = originSpecificRoutes.length > 0 ? originSpecificRoutes : originScoredRoutes.map((i) => i.route);
    const destCandidateRoutes = destSpecificRoutes.length > 0 ? destSpecificRoutes : destScoredRoutes.map((i) => i.route);

    // Helper to get route stops array from path
    const getStopsFromPath = (r: any) => {
      const combined = `${r.forward_path || ''} - ${r.backward_path || ''}`;
      return combined
        .split(' - ')
        .map((s) => s.replace(/^[【\[].*?[】\]]\s*:?\s*/g, '').trim())
        .filter((s) => s.length > 2);
    };

    // Helper to find closest stop name for origin/dest in route
    const allOriginKw = [...originKw.specific, ...originKw.broad];
    const allDestKw = [...destKw.specific, ...destKw.broad];

    const findClosestStopInRoute = (r: any, keywords: string[], fallback: string) => {
      const stops = getStopsFromPath(r);
      for (const kw of keywords) {
        const match = stops.find((s) => s.toLowerCase().includes(kw));
        if (match) return match;
      }
      return stops[0] || fallback;
    };

    // Find closest exact stop from 5,531 stops in hanoiStops
    const findExactStopFromDictionary = (keywords: string[], fallback: string) => {
      const stops = hanoiStops as string[];
      for (const kw of keywords) {
        const match = stops.find((s) => s.toLowerCase().includes(kw));
        if (match) return match.trim();
      }
      return fallback;
    };

    const directTrips: any[] = [];
    const transferTrips: any[] = [];

    // ================= PHASE 1: DIRECT ROUTES (1 TUYẾN) =================
    // Direct routes MUST have specific keyword matches on BOTH origin and dest
    const directCandidateRoutes = originScoredRoutes
      .filter((o) => (originKw.specific.length === 0 || o.spec > 0))
      .filter((o) => destScoredRoutes.some((d) => d.route.id === o.route.id && (destKw.specific.length === 0 || d.spec > 0)))
      .map((i) => i.route);

    for (const route of directCandidateRoutes.slice(0, 2)) {
      const boardingStop = findClosestStopInRoute(route, allOriginKw, findExactStopFromDictionary(allOriginKw, `Trạm gần ${originName}`));
      const alightingStop = findClosestStopInRoute(route, allDestKw, findExactStopFromDictionary(allDestKw, `Trạm gần ${destName}`));
      const walkToStart = 150;
      const walkFromEnd = 150;

      directTrips.push({
        type: 'DIRECT',
        routeId: route.id,
        routeCode: route.route_code,
        routeName: route.route_name,
        enterprise: route.enterprise,
        price: route.price || '8.000đ/lượt',
        operatingHours: route.operating_hours || '5h00 - 21h00',
        interval: route.interval || '10-15 phút/chuyến',
        isElectric: route.route_code.startsWith('E'),
        boardingStop: {
          stopName: boardingStop,
          walkDistanceM: walkToStart,
        },
        alightingStop: {
          stopName: alightingStop,
          walkDistanceM: walkFromEnd,
        },
        stopsCount: 10,
        estimatedDurationMinutes: 30,
        totalWalkMeters: walkToStart + walkFromEnd,
        summary: `Đi thẳng tuyến ${route.route_code} từ [${boardingStop}] đến [${alightingStop}]`,
      });
    }

    // ================= PHASE 2: TRANSFER ROUTES (2 TUYẾN / 1 LẦN ĐỔI XE) =================
    const seenPairs = new Set<string>();

    for (const r1 of originCandidateRoutes.slice(0, 6)) {
      const stops1 = getStopsFromPath(r1);
      const boardingStopName = findClosestStopInRoute(r1, allOriginKw, findExactStopFromDictionary(allOriginKw, `Trạm gần ${originName}`));

      for (const r2 of destCandidateRoutes.slice(0, 8)) {
        if (r1.id === r2.id) continue;
        const pairKey = `${r1.route_code}-${r2.route_code}`;
        if (seenPairs.has(pairKey)) continue;

        const stops2 = getStopsFromPath(r2);
        const alightingStopName = findClosestStopInRoute(r2, allDestKw, findExactStopFromDictionary(allDestKw, `Trạm gần ${destName}`));

        // Find intersection stop between r1 and r2
        let transferStopName = '';
        let isMajorHub = false;

        const fullText1 = `${r1.route_name} ${r1.forward_path || ''} ${r1.backward_path || ''}`.toLowerCase();
        const fullText2 = `${r2.route_name} ${r2.forward_path || ''} ${r2.backward_path || ''}`.toLowerCase();

        // 1. Check for major interchange hub first (Hào Nam, Long Biên, Cầu Giấy, Kim Mã, Mỹ Đình, Gia Lâm...)
        for (const hub of MAJOR_HUBS) {
          if (fullText1.includes(hub) && fullText2.includes(hub)) {
            const match1 = stops1.find((s) => s.toLowerCase().includes(hub));
            const match2 = stops2.find((s) => s.toLowerCase().includes(hub));
            transferStopName = match1 || match2 || `Điểm trung chuyển ${hub.charAt(0).toUpperCase() + hub.slice(1)}`;
            isMajorHub = true;
            break;
          }
        }

        // 2. Check for common stop in route paths
        if (!transferStopName) {
          for (const s1 of stops1) {
            if (s1.length < 4) continue;
            const norm1 = s1.toLowerCase().replace(/bến xe|điểm đỗ|trạm|công viên|đường|phố/g, '').trim();
            const match = stops2.find((s2) => {
              const norm2 = s2.toLowerCase().replace(/bến xe|điểm đỗ|trạm|công viên|đường|phố/g, '').trim();
              return norm1.length > 3 && (norm2.includes(norm1) || norm1.includes(norm2));
            });
            if (match) {
              transferStopName = s1;
              break;
            }
          }
        }

        if (transferStopName) {
          seenPairs.add(pairKey);

          const walkStart = 180;
          const walkTransfer = isMajorHub ? 30 : 60;
          const walkEnd = 120;
          const totalWalk = walkStart + walkTransfer + walkEnd;

          // Format clean transfer name
          const cleanTransfer = transferStopName.charAt(0).toUpperCase() + transferStopName.slice(1);

          transferTrips.push({
            type: 'TRANSFER',
            leg1: {
              routeId: r1.id,
              routeCode: r1.route_code,
              routeName: r1.route_name,
              enterprise: r1.enterprise,
              price: r1.price || '10.000đ/lượt',
              isElectric: r1.route_code.startsWith('E'),
              boardingStop: {
                stopName: boardingStopName,
                walkDistanceM: walkStart,
              },
              alightingStop: {
                stopName: cleanTransfer,
              },
              stopsCount: 6,
            },
            transfer: {
              stopName: cleanTransfer,
              walkDistanceM: walkTransfer,
              isMajorHub,
              instruction: `Xuống tại trạm [${cleanTransfer}] và đổi sang tuyến ${r2.route_code}`,
            },
            leg2: {
              routeId: r2.id,
              routeCode: r2.route_code,
              routeName: r2.route_name,
              enterprise: r2.enterprise,
              price: r2.price || '10.000đ/lượt',
              isElectric: r2.route_code.startsWith('E'),
              boardingStop: {
                stopName: cleanTransfer,
              },
              alightingStop: {
                stopName: alightingStopName,
                walkDistanceM: walkEnd,
              },
              stopsCount: 7,
            },
            totalStops: 13,
            totalWalkMeters: totalWalk,
            estimatedDurationMinutes: 40,
            totalEstimatedFare: 20000,
            summary: `Tuyến ${r1.route_code} ➔ Đổi tại [${cleanTransfer}] ➔ Tuyến ${r2.route_code}`,
          });
        }
      }
    }

    // Sort transfer trips by major hub and minimum walking distance
    transferTrips.sort((a, b) => {
      if (a.transfer.isMajorHub && !b.transfer.isMajorHub) return -1;
      if (!a.transfer.isMajorHub && b.transfer.isMajorHub) return 1;
      return a.totalWalkMeters - b.totalWalkMeters;
    });

    // Pick only top 2 direct routes OR top 3 most optimal transfer routes
    const finalTrips = directTrips.length > 0 
      ? directTrips.slice(0, 2)
      : transferTrips.slice(0, 3).map((trip, idx) => ({
          ...trip,
          isRecommended: idx === 0,
          totalEstimatedFare: 16000,
          recommendedTicketTypeId: 'c6666666-1111-1111-1111-111111111111',
          recommendedTicketTypeName: 'Vé liên tuyến (Đổi 2 xe)',
        }));

    return NextResponse.json({
      origin: {
        name: originName,
        address: originAddress,
        coordinates: originLocation,
        candidateRoutesCount: originCandidateRoutes.length,
      },
      destination: {
        name: destName,
        address: destAddress,
        coordinates: destLocation,
        candidateRoutesCount: destCandidateRoutes.length,
      },
      hasDirect: directTrips.length > 0,
      hasTransfer: transferTrips.length > 0,
      trips: finalTrips,
    });
  } catch (err: any) {
    console.error('[Find Trip API Error]:', err);
    return NextResponse.json({ error: { message: err.message || 'Lỗi khi tìm chuyến xe' } }, { status: 500 });
  }
}
