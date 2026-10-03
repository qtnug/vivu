'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Bus, MapPin, Clock, ArrowLeft, Ticket, DollarSign, Building2, Navigation, Compass, Layers, ArrowRight, ArrowLeftRight, CheckCircle2 } from 'lucide-react';

interface StopItem {
  id: string;
  stopSequence: number;
  stopName: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  distanceFromStartKm: number;
}

function parsePathToStops(pathStr: string, existingStops: any[] = []): StopItem[] {
  if (!pathStr) {
    if (existingStops && existingStops.length > 0) return existingStops;
    return [];
  }

  // Split by hyphens or dashes and clean up tokens
  const rawSegments = pathStr
    .split(/[-–—]/)
    .map((s) =>
      s
        .replace(/&nbsp;/g, ' ')
        .replace(/<[^>]+>/g, '')
        .replace(/^Chiều\s*(đi|về):\s*/i, '')
        .replace(/^Lộ\s*trình\s*(chiều\s*)?(đi|về):\s*/i, '')
        .replace(/\.$/, '')
        .trim()
    )
    .filter((s) => s.length > 1 && !/^(chiều đi|chiều về|lộ trình|tuyến|điểm đầu cuối)$/i.test(s));

  if (rawSegments.length === 0) {
    return existingStops || [];
  }

  // Deduplicate consecutive stops
  const distinctNames: string[] = [];
  for (const seg of rawSegments) {
    if (distinctNames.length === 0 || distinctNames[distinctNames.length - 1].toLowerCase() !== seg.toLowerCase()) {
      distinctNames.push(seg);
    }
  }

  return distinctNames.map((name, idx) => {
    const matched = existingStops?.find(
      (es) => es.stopName?.toLowerCase().trim() === name.toLowerCase().trim()
    );

    const distance = parseFloat((idx * 1.35 + (idx > 0 ? 0.4 : 0)).toFixed(1));

    return {
      id: matched?.id || `timeline-stop-${idx + 1}`,
      stopSequence: idx + 1,
      stopName: name,
      address: matched?.address || `${name}, TP. Hà Nội`,
      latitude: matched?.latitude || null,
      longitude: matched?.longitude || null,
      distanceFromStartKm: matched?.distanceFromStartKm ?? distance,
    };
  });
}

export default function RouteDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const [route, setRoute] = useState<any>(null);
  const [activeDirection, setActiveDirection] = useState<'FORWARD' | 'BACKWARD'>('FORWARD');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/routes/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setRoute(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  // Parse stops for both directions
  const forwardStops = useMemo(() => {
    if (!route) return [];
    return parsePathToStops(route.forwardPath, route.stops);
  }, [route]);

  const backwardStops = useMemo(() => {
    if (!route) return [];
    return parsePathToStops(route.backwardPath, []);
  }, [route]);

  const currentStops = activeDirection === 'FORWARD' ? forwardStops : backwardStops;
  const firstStop = currentStops.length > 0 ? currentStops[0].stopName : 'Điểm đầu';
  const lastStop = currentStops.length > 0 ? currentStops[currentStops.length - 1].stopName : 'Điểm cuối';
  const totalDistance = currentStops.length > 0 ? currentStops[currentStops.length - 1].distanceFromStartKm : 0;

  if (loading) {
    return (
      <div className="text-center py-20 text-slate-500 text-sm">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full mx-auto mb-3"></div>
        Đang tải thông tin chi tiết lộ trình tuyến xe buýt...
      </div>
    );
  }

  if (!route || route.error) {
    return (
      <div className="max-w-xl mx-auto py-20 px-4 text-center">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Không tìm thấy tuyến xe buýt</h2>
        <p className="text-sm text-slate-600 mb-6">Tuyến xe bạn yêu cầu không tồn tại hoặc đã ngừng hoạt động.</p>
        <Link href="/routes" className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">
          Quay lại danh mục tuyến
        </Link>
      </div>
    );
  }

  const isElectric = route.routeCode?.startsWith('E');
  const isAirport = ['07', '17', '68', '86', '86CT', '90', '109', 'E10'].includes(route.routeCode);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
      <Link href="/routes" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-4 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" />
        Quay lại danh sách tuyến xe buýt
      </Link>

      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <span
              className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl font-extrabold text-2xl sm:text-3xl flex items-center justify-center shrink-0 shadow-md ${
                isElectric
                  ? 'bg-gradient-to-br from-teal-500 to-emerald-700 text-white'
                  : isAirport
                  ? 'bg-gradient-to-br from-sky-500 to-indigo-600 text-white'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              {route.routeCode}
            </span>
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                {isElectric && (
                  <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
                    VinBus Điện
                  </span>
                )}
                {isAirport && (
                  <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
                    Tuyến Sân bay
                  </span>
                )}
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                  Đang hoạt động
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">{route.routeName}</h1>
              {route.enterprise && (
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                  <Building2 className="w-3.5 h-3.5" />
                  Đơn vị quản lý: <strong>{route.enterprise}</strong>
                </p>
              )}
            </div>
          </div>

          <Link
            href={`/booking?routeId=${route.id}`}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md transition-all shrink-0 hover:scale-[1.02]"
          >
            <Ticket className="w-4 h-4" />
            Mua vé cho tuyến này
          </Link>
        </div>

        {/* Quick Highlights Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <span className="text-[11px] text-slate-500 block mb-1 flex items-center gap-1 font-medium">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              Giờ hoạt động
            </span>
            <span className="font-bold text-slate-900 text-sm">{route.operatingHours || '05:00 - 21:00'}</span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <span className="text-[11px] text-slate-500 block mb-1 flex items-center gap-1 font-medium">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
              Giá vé lượt
            </span>
            <span className="font-bold text-emerald-700 text-sm">{route.price || '10.000đ/lượt'}</span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <span className="text-[11px] text-slate-500 block mb-1 flex items-center gap-1 font-medium">
              <Compass className="w-3.5 h-3.5 text-blue-600" />
              Giãn cách
            </span>
            <span className="font-bold text-slate-900 text-sm">{route.interval || '10 - 15 phút'}</span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <span className="text-[11px] text-slate-500 block mb-1 flex items-center gap-1 font-medium">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              Quy mô tuyến
            </span>
            <span className="font-bold text-slate-900 text-sm">{forwardStops.length} trạm đi • {backwardStops.length} trạm về</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Ordered Stops Timeline */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-sm">
            {/* Direction Switcher Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 mb-6 border-b border-slate-100">
              <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setActiveDirection('FORWARD')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
                    activeDirection === 'FORWARD'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  Lộ trình Chiều đi ({forwardStops.length} trạm)
                </button>

                <button
                  onClick={() => setActiveDirection('BACKWARD')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
                    activeDirection === 'BACKWARD'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  Lộ trình Chiều về ({backwardStops.length} trạm)
                </button>
              </div>

              {/* Direction Terminal Info */}
              <div className="text-xs text-slate-500 text-left sm:text-right">
                <span className="font-semibold text-slate-700">Ước tính cự ly:</span> ~{totalDistance} km
              </div>
            </div>

            {/* Terminal Header Card */}
            <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200/70 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                  {activeDirection === 'FORWARD' ? 'ĐI' : 'VỀ'}
                </div>
                <div>
                  <div className="text-xs text-emerald-800 font-semibold">
                    {firstStop} <span className="text-emerald-500 font-normal">➔</span> {lastStop}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Toàn bộ {currentStops.length} trạm dừng theo thứ tự di chuyển của xe
                  </div>
                </div>
              </div>
            </div>

            {/* Vertical Timeline */}
            {currentStops.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                Chưa có dữ liệu trạm dừng chi tiết cho chiều này.
              </div>
            ) : (
              <div className="relative pl-7 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-3.5 before:top-4 before:bottom-4 before:w-0.5 before:bg-gradient-to-b before:from-emerald-500 before:via-emerald-300 before:to-rose-500">
                {currentStops.map((stop, idx) => {
                  const isFirst = idx === 0;
                  const isLast = idx === currentStops.length - 1;

                  return (
                    <div key={`${activeDirection}-${stop.id}-${idx}`} className="relative group">
                      {/* Timeline Node Bullet */}
                      <div
                        className={`absolute -left-7 sm:-left-8 top-0.5 w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 flex items-center justify-center text-[10px] sm:text-[11px] font-bold transition-transform group-hover:scale-110 ${
                          isFirst
                            ? 'bg-emerald-600 border-white text-white shadow-md ring-2 ring-emerald-200'
                            : isLast
                            ? 'bg-rose-600 border-white text-white shadow-md ring-2 ring-rose-200'
                            : 'bg-white border-emerald-500 text-emerald-800 shadow-sm'
                        }`}
                      >
                        {isFirst ? (
                          <MapPin className="w-3 h-3 text-white" />
                        ) : isLast ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        ) : (
                          stop.stopSequence
                        )}
                      </div>

                      {/* Stop Content Card */}
                      <div className="bg-slate-50/70 hover:bg-emerald-50/50 border border-slate-200/80 hover:border-emerald-300 p-3.5 rounded-xl transition-all flex items-start justify-between gap-3 shadow-2xs">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            {isFirst && (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-600 text-white">
                                Trạm xuất phát (Đầu tuyến)
                              </span>
                            )}
                            {isLast && (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-600 text-white">
                                Trạm đích (Cuối tuyến)
                              </span>
                            )}
                            <span className="text-[11px] font-bold text-slate-400">
                              Trạm #{stop.stopSequence}
                            </span>
                          </div>

                          <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug">
                            {stop.stopName}
                          </h3>

                          {stop.address && (
                            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed truncate">
                              {stop.address}
                            </p>
                          )}

                          {stop.latitude && stop.longitude && (
                            <span className="text-[10px] text-slate-400 font-mono mt-1 inline-block">
                              Tọa độ GPS: {stop.latitude}, {stop.longitude}
                            </span>
                          )}
                        </div>

                        {/* Distance Badge */}
                        <div className="text-right shrink-0">
                          <span className="text-xs font-bold text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-2xs inline-block">
                            {stop.distanceFromStartKm} km
                          </span>
                          <span className="block text-[10px] text-slate-400 mt-0.5">Tích lũy</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Timetable / Schedules & Actions */}
        <div className="space-y-6 h-fit">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="font-bold text-slate-900 text-base flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <Clock className="w-4 h-4 text-amber-600" />
              Khung giờ xuất bến mẫu
            </h2>

            {route.schedules && route.schedules.length > 0 ? (
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {route.schedules.map((sch: any, sIdx: number) => (
                  <div key={`sch-${sch.id || sIdx}-${sIdx}`} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between hover:border-emerald-300 transition-colors">
                    <div>
                      <span className="text-base font-bold text-slate-900 font-mono">{sch.departureTime}</span>
                      <p className="text-[11px] text-slate-500">
                        Vận tốc: {sch.averageSpeedKmh} km/h • {sch.daysOfWeek}
                      </p>
                    </div>
                    <span className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-lg font-semibold">
                      Xuất bến
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">Tần suất 10 - 15 phút/chuyến liên tục theo giờ hoạt động.</p>
            )}

            <div className="mt-6 pt-4 border-t border-slate-100">
              <Link
                href={`/booking?routeId=${route.id}`}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
              >
                <Ticket className="w-4 h-4" />
                Mua vé điện tử tuyến {route.routeCode}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
