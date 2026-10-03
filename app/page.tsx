'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Bus,
  Search,
  MapPin,
  ArrowRight,
  Clock,
  Ticket,
  QrCode,
  Navigation,
  Sparkles,
  Footprints,
  ChevronRight,
  ShieldCheck,
  Zap,
  MapPinCheck,
  Compass,
} from 'lucide-react';

export default function HomePage() {
  const [popularRoutes, setPopularRoutes] = useState<any[]>([]);
  const [loadingRoutes, setLoadingRoutes] = useState(true);

  // Search State
  const [fromQuery, setFromQuery] = useState('');
  const [toQuery, setToQuery] = useState('');
  const [fromPlaceId, setFromPlaceId] = useState('');
  const [toPlaceId, setToPlaceId] = useState('');
  const [routeCodeQuery, setRouteCodeQuery] = useState('');

  // Autocomplete Suggestions
  const [fromSuggestions, setFromSuggestions] = useState<any[]>([]);
  const [toSuggestions, setToSuggestions] = useState<any[]>([]);
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);

  // Trip Search Results
  const [tripResults, setTripResults] = useState<any | null>(null);
  const [searchingTrips, setSearchingTrips] = useState(false);
  const [searchError, setSearchError] = useState('');

  const fromRef = useRef<HTMLDivElement>(null);
  const toRef = useRef<HTMLDivElement>(null);

  // Load only curated popular routes on home page for lightning speed
  useEffect(() => {
    fetch('/api/routes')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const popularCodes = ['01', '02', '08A', '09A', '26', '32', 'E01', '86'];
          const featured = data.filter((r) => popularCodes.includes(r.routeCode || r.route_code));
          setPopularRoutes(featured.length > 0 ? featured : data.slice(0, 6));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingRoutes(false));
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (fromRef.current && !fromRef.current.contains(e.target as Node)) {
        setShowFromDropdown(false);
      }
      if (toRef.current && !toRef.current.contains(e.target as Node)) {
        setShowToDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced Autocomplete for Origin
  useEffect(() => {
    if (!fromQuery.trim() || fromQuery.length < 2) {
      setFromSuggestions([]);
      return;
    }
    const timer = setTimeout(() => {
      fetch(`/api/places/autocomplete?input=${encodeURIComponent(fromQuery.trim())}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.predictions) setFromSuggestions(data.predictions);
        })
        .catch(() => {});
    }, 250);
    return () => clearTimeout(timer);
  }, [fromQuery]);

  // Debounced Autocomplete for Destination
  useEffect(() => {
    if (!toQuery.trim() || toQuery.length < 2) {
      setToSuggestions([]);
      return;
    }
    const timer = setTimeout(() => {
      fetch(`/api/places/autocomplete?input=${encodeURIComponent(toQuery.trim())}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.predictions) setToSuggestions(data.predictions);
        })
        .catch(() => {});
    }, 250);
    return () => clearTimeout(timer);
  }, [toQuery]);

  // Quick GPS Location Handler
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('Trình duyệt của bạn không hỗ trợ định vị GPS.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFromQuery('Vị trí hiện tại của tôi');
        setFromPlaceId('');
        // Trigger trip search if destination exists
      },
      (err) => {
        alert('Không thể truy cập GPS: ' + err.message);
      }
    );
  };

  // Find Trips
  const handleFindTrips = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError('');

    if (routeCodeQuery.trim()) {
      // Direct Route Code Search
      setSearchingTrips(true);
      try {
        const res = await fetch(`/api/routes?search=${encodeURIComponent(routeCodeQuery.trim())}`);
        const data = await res.json();
        setTripResults({
          isRouteSearch: true,
          routes: Array.isArray(data) ? data : [],
        });
      } catch (err: any) {
        setSearchError('Lỗi khi tra cứu tuyến xe');
      } finally {
        setSearchingTrips(false);
      }
      return;
    }

    if (!fromQuery.trim() || !toQuery.trim()) {
      setSearchError('Vui lòng nhập cả Điểm đi và Điểm đến để tìm chuyến phù hợp.');
      return;
    }

    setSearchingTrips(true);
    try {
      const res = await fetch('/api/places/find-trip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: fromQuery.trim(),
          to: toQuery.trim(),
          fromPlaceId,
          toPlaceId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Không tìm thấy chuyến đi');
      }

      setTripResults(data);
    } catch (err: any) {
      setSearchError(err.message || 'Không thể tìm chuyến xe. Vui lòng thử lại.');
    } finally {
      setSearchingTrips(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white py-14 sm:py-20 px-4 sm:px-6 lg:px-8 border-b border-slate-800 relative overflow-hidden">
        {/* Subtle Background Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center space-y-5 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-900/60 border border-emerald-700/50 text-emerald-300 text-xs font-semibold shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Mạng lưới xe buýt Hà Nội • Tích hợp bản đồ thông minh Goong Map</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Tìm điểm dừng gần nhất & Mua vé xe buýt điện tử
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Nhập điểm xuất phát và điểm đến để tìm tuyến buýt đi qua gần bạn nhất. Thanh toán tức thì qua VietQR NAPAS 24/7.
          </p>

          {/* Quick Smart Search Form */}
          <form
            onSubmit={handleFindTrips}
            className="bg-white rounded-2xl shadow-2xl p-4 sm:p-6 text-slate-800 max-w-3xl mx-auto border border-slate-200 mt-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              {/* Origin Autocomplete */}
              <div ref={fromRef} className="relative text-left md:col-span-5">
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    Điểm đi / Trạm đón
                  </span>
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    className="text-[10px] text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-0.5"
                  >
                    <Navigation className="w-2.5 h-2.5" />
                    GPS
                  </button>
                </label>

                <div className="relative">
                  <input
                    type="text"
                    placeholder="VD: Bến xe Long Biên, Kim Mã..."
                    value={fromQuery}
                    onChange={(e) => {
                      setFromQuery(e.target.value);
                      setFromPlaceId('');
                      setShowFromDropdown(true);
                    }}
                    onFocus={() => setShowFromDropdown(true)}
                    className="w-full pl-3 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                  />

                  {/* Dropdown Menu */}
                  {showFromDropdown && fromSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto">
                      {fromSuggestions.map((item) => (
                        <div
                          key={item.place_id}
                          onClick={() => {
                            setFromQuery(item.main_text || item.description);
                            setFromPlaceId(item.place_id);
                            setShowFromDropdown(false);
                          }}
                          className="px-3.5 py-2.5 hover:bg-emerald-50/80 cursor-pointer border-b border-slate-50 last:border-0 text-left transition-colors flex items-start gap-2.5"
                        >
                          <MapPin className={`w-4 h-4 mt-0.5 shrink-0 ${item.is_bus_stop ? 'text-emerald-600' : 'text-slate-400'}`} />
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-semibold text-slate-800 truncate">{item.main_text}</p>
                            <p className="text-[11px] text-slate-500 truncate">{item.secondary_text || item.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Destination Autocomplete */}
              <div ref={toRef} className="relative text-left md:col-span-5">
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-rose-600" />
                  Điểm đến / Trạm xuống
                </label>

                <div className="relative">
                  <input
                    type="text"
                    placeholder="VD: Bến xe Yên Nghĩa, Nội Bài..."
                    value={toQuery}
                    onChange={(e) => {
                      setToQuery(e.target.value);
                      setToPlaceId('');
                      setShowToDropdown(true);
                    }}
                    onFocus={() => setShowToDropdown(true)}
                    className="w-full pl-3 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                  />

                  {/* Dropdown Menu */}
                  {showToDropdown && toSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto">
                      {toSuggestions.map((item) => (
                        <div
                          key={item.place_id}
                          onClick={() => {
                            setToQuery(item.main_text || item.description);
                            setToPlaceId(item.place_id);
                            setShowToDropdown(false);
                          }}
                          className="px-3.5 py-2.5 hover:bg-emerald-50/80 cursor-pointer border-b border-slate-50 last:border-0 text-left transition-colors flex items-start gap-2.5"
                        >
                          <MapPin className={`w-4 h-4 mt-0.5 shrink-0 ${item.is_bus_stop ? 'text-rose-600' : 'text-slate-400'}`} />
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-semibold text-slate-800 truncate">{item.main_text}</p>
                            <p className="text-[11px] text-slate-500 truncate">{item.secondary_text || item.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={searchingTrips}
                  className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer"
                >
                  {searchingTrips ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      Tìm chuyến
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Quick Route Code Search & Suggestions */}
            <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <span>Hoặc tra cứu mã tuyến:</span>
                <input
                  type="text"
                  placeholder="VD: 01, E01, 86"
                  value={routeCodeQuery}
                  onChange={(e) => setRouteCodeQuery(e.target.value)}
                  className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs w-32 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
                />
              </div>

              <div className="flex gap-1.5 items-center flex-wrap">
                <span>Tuyến nhanh:</span>
                {['01', '02', '08A', '26', '32', '86', 'E01'].map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => {
                      setRouteCodeQuery(code);
                      setFromQuery('');
                      setToQuery('');
                      fetch(`/api/routes?search=${code}`)
                        .then((r) => r.json())
                        .then((data) => {
                          setTripResults({
                            isRouteSearch: true,
                            routes: Array.isArray(data) ? data : [],
                          });
                        });
                    }}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 font-bold rounded-md text-[11px] transition-colors"
                  >
                    Tuyến {code}
                  </button>
                ))}
              </div>
            </div>
          </form>

          {searchError && (
            <p className="text-xs text-rose-300 bg-rose-950/60 border border-rose-800/80 px-4 py-2 rounded-xl max-w-md mx-auto">
              {searchError}
            </p>
          )}
        </div>
      </section>

      {/* Main Content Area */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1">
        {/* Trip Search Results Display */}
        {tripResults && (
          <div className="mb-12 bg-slate-50 border border-emerald-200 rounded-2xl p-5 sm:p-7 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 flex items-center gap-2">
                  <Compass className="w-5 h-5 text-emerald-600" />
                  {tripResults.isRouteSearch
                    ? `Kết quả tra cứu tuyến (${tripResults.routes?.length || 0} tuyến)`
                    : `Chuyến xe gợi ý từ "${tripResults.origin?.name}" đến "${tripResults.destination?.name}"`}
                </h2>
                {!tripResults.isRouteSearch && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    Đã tìm thấy {tripResults.trips?.length || 0} lộ trình xe buýt thuận tiện nhất
                  </p>
                )}
              </div>

              <button
                onClick={() => setTripResults(null)}
                className="text-xs text-slate-500 hover:text-slate-800 font-semibold px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
              >
                Đóng kết quả
              </button>
            </div>

            {/* Route Code Results */}
            {tripResults.isRouteSearch ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tripResults.routes?.map((r: any) => (
                  <div key={r.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-extrabold text-sm flex items-center justify-center shrink-0">
                          {r.routeCode}
                        </span>
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm leading-snug">{r.routeName}</h3>
                          <span className="text-[11px] text-slate-500 block">
                            {r.price || '10.000đ/lượt'} • {r.stopCount || 20} trạm
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-2 mt-2">{r.description}</p>
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-slate-100 mt-3">
                      <Link
                        href={`/routes/${r.id}`}
                        className="flex-1 text-center py-2 px-3 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
                      >
                        Xem lộ trình dọc
                      </Link>
                      <Link
                        href={`/booking?routeId=${r.id}`}
                        className="flex-1 text-center py-2 px-3 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                      >
                        Mua vé tuyến này
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Spatial & Keyword Find Trip Results */
              <div className="space-y-4">
                {tripResults.trips?.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs">
                    Không tìm thấy tuyến xe buýt hoặc lộ trình chuyển tuyến giữa 2 điểm này. Vui lòng thử tìm kiếm theo địa danh lớn.
                  </div>
                ) : (
                  tripResults.trips?.map((trip: any, idx: number) => {
                    if (trip.type === 'DIRECT') {
                      return (
                        <div
                          key={`direct-${trip.routeId}-${idx}`}
                          className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs hover:border-emerald-300 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                        >
                          {/* Left: Route Code & Summary */}
                          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                            <div
                              className={`w-12 h-12 rounded-2xl font-extrabold text-base flex items-center justify-center shrink-0 shadow-2xs ${
                                trip.isElectric
                                  ? 'bg-gradient-to-br from-teal-500 to-emerald-700 text-white'
                                  : 'bg-emerald-600 text-white'
                              }`}
                            >
                              {trip.routeCode}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full">
                                  Đi thẳng (1 tuyến)
                                </span>
                                <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug truncate">
                                  {trip.routeName}
                                </h3>
                              </div>

                              {/* Itinerary Details */}
                              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-2">
                                <span className="flex items-center gap-1 font-medium text-emerald-700">
                                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                                  Đón tại: <strong>{trip.boardingStop?.stopName}</strong> (~{trip.boardingStop?.walkDistanceM || 200}m đi bộ)
                                </span>
                                <span className="text-slate-300 hidden sm:inline">•</span>
                                <span className="flex items-center gap-1 font-medium text-rose-700">
                                  <MapPinCheck className="w-3.5 h-3.5 text-rose-600" />
                                  Xuống tại: <strong>{trip.alightingStop?.stopName}</strong>
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Right: Meta & Action Buttons */}
                          <div className="flex items-center justify-between sm:justify-end gap-3 pt-3 lg:pt-0 border-t lg:border-0 border-slate-100 shrink-0">
                            <div className="text-left sm:text-right">
                              <span className="text-xs font-bold text-emerald-700 block">{trip.price}</span>
                              <span className="text-[11px] text-slate-400 block">
                                🚶 Tổng đi bộ: ~{trip.totalWalkMeters}m • ~{trip.estimatedDurationMinutes} phút
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <Link
                                href={`/routes/${trip.routeId}`}
                                className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                              >
                                Lộ trình
                              </Link>
                              <Link
                                href={`/booking?routeId=${trip.routeId}`}
                                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1"
                              >
                                Mua vé
                                <ArrowRight className="w-3.5 h-3.5" />
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // 2-LEG TRANSFER TRIP
                    return (
                      <div
                        key={`transfer-${idx}`}
                        className={`bg-white rounded-2xl border-2 p-5 shadow-xs transition-all space-y-4 ${
                          trip.isRecommended
                            ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md'
                            : 'border-sky-200/80 hover:border-sky-400'
                        }`}
                      >
                        {/* Header: Badges & Summary */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                          <div className="flex items-center gap-2 flex-wrap">
                            {trip.isRecommended ? (
                              <span className="text-[11px] bg-emerald-600 text-white font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                                ⭐ Gợi ý tối ưu nhất (Ít đi bộ)
                              </span>
                            ) : (
                              <span className="text-[11px] bg-sky-100 text-sky-800 font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                🔄 Phương án chuyển tuyến {idx + 1}
                              </span>
                            )}
                            <span className="text-xs font-bold text-slate-800">
                              Tuyến {trip.leg1.routeCode} ➔ Đổi tại [{trip.transfer.stopName}] ➔ Tuyến {trip.leg2.routeCode}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs">
                            <span className="font-extrabold text-emerald-700">
                              {(trip.totalEstimatedFare || 16000).toLocaleString('vi-VN')} đ (Vé liên tuyến - 2 x 8.000đ)
                            </span>
                            <span className="text-slate-400 font-semibold">
                              🚶 Đi bộ: ~{trip.totalWalkMeters}m • ~{trip.estimatedDurationMinutes} phút
                            </span>
                          </div>
                        </div>

                        {/* Step-by-Step Roadmap */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          {/* Chặng 1 */}
                          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3">
                            <span className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                              {trip.leg1.routeCode}
                            </span>
                            <div className="min-w-0">
                              <span className="text-[10px] font-bold text-slate-400 uppercase">Chặng 1: Tuyến {trip.leg1.routeCode}</span>
                              <p className="font-semibold text-slate-900 truncate">{trip.leg1.routeName}</p>
                              <div className="text-[11px] text-slate-600 mt-1 space-y-0.5">
                                <p>• <strong>Đón:</strong> {trip.leg1.boardingStop.stopName} (đi bộ ~{trip.leg1.boardingStop.walkDistanceM}m)</p>
                                <p>• <strong>Đến trạm chuyển:</strong> {trip.transfer.stopName}</p>
                              </div>
                            </div>
                          </div>

                          {/* Chặng 2 */}
                          <div className="p-3.5 rounded-xl bg-sky-50/70 border border-sky-200 flex items-start gap-3">
                            <span className="w-8 h-8 rounded-lg bg-sky-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                              {trip.leg2.routeCode}
                            </span>
                            <div className="min-w-0">
                              <span className="text-[10px] font-bold text-sky-700 uppercase">Chặng 2: Tuyến {trip.leg2.routeCode}</span>
                              <p className="font-semibold text-slate-900 truncate">{trip.leg2.routeName}</p>
                              <div className="text-[11px] text-slate-600 mt-1 space-y-0.5">
                                <p>• <strong>Chuyển xe:</strong> Đổi sang Tuyến {trip.leg2.routeCode} tại {trip.transfer.stopName} (~{trip.transfer.walkDistanceM}m)</p>
                                <p>• <strong>Xuống:</strong> {trip.leg2.alightingStop.stopName} (cách điểm đến ~{trip.leg2.alightingStop.walkDistanceM}m)</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row items-center justify-between pt-2 border-t border-slate-100 text-xs gap-3">
                          <span className="text-slate-400 italic text-[11px]">
                            * Mua 1 vé liên tuyến (16.000đ - x2 giá lượt) hoặc vé ngày/tháng để quét đi cả 2 chuyến xe
                          </span>

                          <div className="flex items-center gap-2">
                            <Link
                              href={`/routes/${trip.leg1.routeId}`}
                              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50"
                            >
                              Lộ trình T{trip.leg1.routeCode}
                            </Link>
                            <Link
                              href={`/routes/${trip.leg2.routeId}`}
                              className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50"
                            >
                              Lộ trình T{trip.leg2.routeCode}
                            </Link>
                            <Link
                              href={`/booking?tripType=TRANSFER&leg1RouteId=${trip.leg1.routeId}&leg2RouteId=${trip.leg2.routeId}&leg1Code=${trip.leg1.routeCode}&leg2Code=${trip.leg2.routeCode}&transferHub=${encodeURIComponent(trip.transfer.stopName)}&ticketTypeId=c6666666-1111-1111-1111-111111111111`}
                              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs flex items-center gap-1.5"
                            >
                              Mua vé liên tuyến (2 xe)
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
              <Ticket className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1.5">Đặt mua vé điện tử 3 bước</h3>
            <p className="text-xs sm:text-sm text-slate-600 mb-4 leading-relaxed">
              Quy trình mua vé đơn giản: Chọn tuyến xe, chọn loại vé (vé lượt, vé ngày, vé tháng) và thanh toán tự động qua VietQR.
            </p>
            <Link
              href="/booking"
              className="inline-flex items-center text-xs sm:text-sm font-bold text-emerald-700 hover:text-emerald-800 gap-1"
            >
              Mua vé ngay <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center mb-4">
              <QrCode className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1.5">Vé của tôi & Quét mã lên xe</h3>
            <p className="text-xs sm:text-sm text-slate-600 mb-4 leading-relaxed">
              Mã QR vé điện tử được mã hoá bảo mật JWT. Hành khách chỉ cần mở điện thoại để nhân viên soát vé quét khi lên xe.
            </p>
            <Link
              href="/my-tickets"
              className="inline-flex items-center text-xs sm:text-sm font-bold text-sky-700 hover:text-sky-800 gap-1"
            >
              Xem vé đã mua <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs hover:shadow-md transition-all">
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1.5">Lộ trình & Biểu đồ trạm dừng</h3>
            <p className="text-xs sm:text-sm text-slate-600 mb-4 leading-relaxed">
              Hiển thị biểu đồ trạm dừng timeline dọc trực quan cho cả 2 chiều đi và về, cùng giờ xuất bến và đơn vị vận hành.
            </p>
            <Link
              href="/routes"
              className="inline-flex items-center text-xs sm:text-sm font-bold text-amber-700 hover:text-amber-800 gap-1"
            >
              Mạng lưới 149 tuyến <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Featured Popular Inner-City Routes (Fast Loading) */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                Tuyến xe buýt nội thành phổ biến
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Các tuyến huyết mạch kết nối các điểm trung chuyển chính (Long Biên, Cầu Giấy, Giáp Bát, Yên Nghĩa, Nội Bài)
              </p>
            </div>
            <Link
              href="/routes"
              className="text-xs sm:text-sm font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 shrink-0"
            >
              Xem tất cả 149 tuyến buýt →
            </Link>
          </div>

          {loadingRoutes ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-36 bg-slate-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {popularRoutes.map((route) => {
                const isElectric = (route.routeCode || route.route_code).startsWith('E');
                const isAirport = ['07', '17', '68', '86', '90', '109'].includes(route.routeCode || route.route_code);

                return (
                  <div
                    key={route.id}
                    className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span
                          className={`w-11 h-11 rounded-xl font-extrabold text-sm flex items-center justify-center shadow-xs ${
                            isElectric
                              ? 'bg-gradient-to-br from-teal-500 to-emerald-700 text-white'
                              : isAirport
                              ? 'bg-gradient-to-br from-sky-600 to-blue-800 text-white'
                              : 'bg-emerald-600 text-white'
                          }`}
                        >
                          {route.routeCode || route.route_code}
                        </span>

                        <span className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold">
                          {route.price || '10.000đ/lượt'}
                        </span>
                      </div>

                      <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug mb-1 line-clamp-1">
                        {route.routeName || route.route_name}
                      </h3>

                      <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
                        {route.enterprise ? `Vận hành: ${route.enterprise} • ` : ''}
                        {route.operatingHours || '5h00 - 21h00'}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">
                        {route.stopCount || 20} điểm dừng
                      </span>
                      <div className="flex gap-2">
                        <Link
                          href={`/routes/${route.id}`}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors"
                        >
                          Lộ trình
                        </Link>
                        <Link
                          href={`/booking?routeId=${route.id}`}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors"
                        >
                          Mua vé
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Explore all routes CTA */}
          <div className="mt-8 text-center">
            <Link
              href="/routes"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold shadow-md transition-all cursor-pointer hover:scale-[1.02]"
            >
              Khám phá toàn bộ 149 tuyến xe buýt Thủ đô
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
