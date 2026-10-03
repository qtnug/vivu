'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Bus, Search, ArrowRight, Clock, DollarSign, Building2, MapPin, Sparkles, Filter } from 'lucide-react';

export default function RoutesPage() {
  const [routes, setRoutes] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const ITEMS_PER_PAGE = 24;

  useEffect(() => {
    fetch('/api/routes')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setRoutes(data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const categories = [
    { id: 'ALL', label: 'Tất cả tuyến', count: routes.length },
    { id: 'VINBUS', label: 'VinBus Điện (E)', count: routes.filter(r => r.routeCode.startsWith('E')).length },
    { id: 'AIRPORT', label: 'Sân bay Nội Bài', count: routes.filter(r => ['07', '17', '68', '86', '86CT', '90', '109', 'E10'].includes(r.routeCode)).length },
    { id: 'INNER', label: 'Tuyến nội đô (01-50)', count: routes.filter(r => {
      const num = parseInt(r.routeCode.replace(/\D/g, ''), 10);
      return !r.routeCode.startsWith('E') && num <= 50;
    }).length },
    { id: 'OUTER', label: 'Tuyến ngoại thành (>50)', count: routes.filter(r => {
      const num = parseInt(r.routeCode.replace(/\D/g, ''), 10);
      return !r.routeCode.startsWith('E') && num > 50;
    }).length },
  ];

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return routes.filter((r) => {
      // Category match
      if (activeCategory === 'VINBUS' && !r.routeCode.startsWith('E')) return false;
      if (activeCategory === 'AIRPORT' && !['07', '17', '68', '86', '86CT', '90', '109', 'E10'].includes(r.routeCode)) return false;
      if (activeCategory === 'INNER') {
        const num = parseInt(r.routeCode.replace(/\D/g, ''), 10);
        if (r.routeCode.startsWith('E') || num > 50) return false;
      }
      if (activeCategory === 'OUTER') {
        const num = parseInt(r.routeCode.replace(/\D/g, ''), 10);
        if (r.routeCode.startsWith('E') || num <= 50) return false;
      }

      // Query match
      if (!q) return true;
      const combined = `${r.routeCode} ${r.routeName} ${r.enterprise || ''} ${r.description || ''} ${r.forwardPath || ''} ${r.backwardPath || ''}`.toLowerCase();
      return combined.includes(q);
    });
  }, [routes, search, activeCategory]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1;
  const paginatedRoutes = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filtered.slice(start, start + ITEMS_PER_PAGE);
  }, [filtered, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, activeCategory]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Dữ liệu thực tế 149 tuyến xe buýt Hà Nội</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Danh mục Tuyến xe buýt</h1>
          <p className="text-sm text-slate-500 mt-0.5">Tra cứu lộ trình chi tiết chiều đi / về, trạm dừng, khung giờ hoạt động và giá vé niêm yết</p>
        </div>

        {/* Search input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Tìm theo số hiệu, tên tuyến, đường..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
          />
        </div>
      </div>

      {/* Category Chips */}
      <div className="flex flex-wrap items-center gap-2 mb-6 pb-2 border-b border-slate-200">
        <Filter className="w-4 h-4 text-slate-400 mr-1 hidden sm:inline-block" />
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeCategory === cat.id
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {cat.label} ({cat.count})
          </button>
        ))}
      </div>

      {/* Result Status */}
      <div className="flex items-center justify-between text-xs text-slate-500 mb-4">
        <span>
          Hiển thị <strong>{paginatedRoutes.length}</strong> / <strong>{filtered.length}</strong> tuyến phù hợp
        </span>
        {totalPages > 1 && (
          <span>
            Trang {currentPage} / {totalPages}
          </span>
        )}
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-500 text-sm">
          <div className="animate-spin w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full mx-auto mb-3"></div>
          Đang tải cơ sở dữ liệu tuyến xe buýt...
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center text-slate-500 border border-slate-200">
          <Bus className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-medium text-slate-700">Không tìm thấy tuyến xe buýt nào phù hợp.</p>
          <p className="text-xs text-slate-400 mt-1">Hãy thử tìm theo số hiệu khác hoặc xóa bộ lọc từ khóa.</p>
          <button
            onClick={() => {
              setSearch('');
              setActiveCategory('ALL');
            }}
            className="mt-4 px-4 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100"
          >
            Xem tất cả tuyến
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {paginatedRoutes.map((route) => {
              const isElectric = route.routeCode.startsWith('E');
              const isAirport = ['07', '17', '68', '86', '86CT', '90', '109', 'E10'].includes(route.routeCode);

              return (
                <div
                  key={route.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-emerald-400 transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Badge & Title */}
                    <div className="flex items-start gap-3 mb-3">
                      <span
                        className={`w-12 h-12 rounded-xl font-extrabold text-base flex items-center justify-center shrink-0 shadow-sm ${
                          isElectric
                            ? 'bg-gradient-to-br from-teal-500 to-emerald-700 text-white'
                            : isAirport
                            ? 'bg-gradient-to-br from-sky-500 to-indigo-600 text-white'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {route.routeCode}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          {isElectric && (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
                              VinBus Điện
                            </span>
                          )}
                          {isAirport && (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
                              Sân bay
                            </span>
                          )}
                          {route.enterprise && (
                            <span className="text-[10px] text-slate-500 truncate max-w-[140px]">
                              {route.enterprise}
                            </span>
                          )}
                        </div>
                        <h2 className="font-bold text-slate-900 text-sm sm:text-base leading-snug truncate" title={route.routeName}>
                          {route.routeName}
                        </h2>
                      </div>
                    </div>

                    {/* Metadata tags */}
                    <div className="grid grid-cols-2 gap-2 my-3 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span className="truncate">{route.operatingHours || '05:00 - 21:00'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{route.price || '10.000đ/lượt'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 col-span-2">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span>{route.stopCount || 20} trạm dừng trên tuyến</span>
                      </div>
                    </div>

                    {/* Route preview */}
                    <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
                      {route.forwardPath || route.description || 'Lộ trình kết nối các điểm trung chuyển thành phố.'}
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                    <Link
                      href={`/routes/${route.id}`}
                      className="flex-1 py-2 text-center rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors"
                    >
                      Chi tiết & Trạm
                    </Link>
                    <Link
                      href={`/booking?routeId=${route.id}`}
                      className="flex-1 py-2 text-center rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center justify-center gap-1"
                    >
                      Mua vé
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
              >
                Trang trước
              </button>
              {Array.from({ length: totalPages }).map((_, idx) => {
                const pageNum = idx + 1;
                // Only show current page, first, last, and neighbors
                if (
                  pageNum === 1 ||
                  pageNum === totalPages ||
                  (pageNum >= currentPage - 2 && pageNum <= currentPage + 2)
                ) {
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                        currentPage === pageNum
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                }
                if (pageNum === currentPage - 3 || pageNum === currentPage + 3) {
                  return <span key={pageNum} className="text-slate-400 text-xs px-1">...</span>;
                }
                return null;
              })}
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
              >
                Trang sau
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
