'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Bus, Ticket, User, Phone, Calendar, ArrowRight, ArrowLeft, ShieldCheck, Check, Search, Filter, Sparkles, CreditCard, QrCode, CheckCircle2 } from 'lucide-react';

function BookingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultRouteId = searchParams.get('routeId');
  const tripType = searchParams.get('tripType');
  const leg1RouteId = searchParams.get('leg1RouteId');
  const leg2RouteId = searchParams.get('leg2RouteId');
  const leg1Code = searchParams.get('leg1Code');
  const leg2Code = searchParams.get('leg2Code');
  const transferHub = searchParams.get('transferHub');
  const presetTicketTypeId = searchParams.get('ticketTypeId');

  const isTransferBooking = tripType === 'TRANSFER' && Boolean(leg1RouteId && leg2RouteId);

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(defaultRouteId || isTransferBooking ? 2 : 1);
  const [routes, setRoutes] = useState<any[]>([]);
  const [ticketTypes, setTicketTypes] = useState<any[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState(leg1RouteId || defaultRouteId || '');
  const [selectedTypeId, setSelectedTypeId] = useState(presetTicketTypeId || (isTransferBooking ? 'c6666666-1111-1111-1111-111111111111' : ''));
  const [quantity, setQuantity] = useState(1);
  const [activationDate, setActivationDate] = useState(new Date().toISOString().split('T')[0]);
  const [guestPhone, setGuestPhone] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [routeSearch, setRouteSearch] = useState('');
  const [routeCategory, setRouteCategory] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check auth
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setCurrentUser(data.user);
          if (data.user.phone) setGuestPhone(data.user.phone);
        }
      })
      .catch(() => {});

    // Fetch routes & ticket types
    Promise.all([
      fetch('/api/routes').then((res) => res.json()),
      fetch('/api/ticket-types').then((res) => res.json()),
    ])
      .then(([routesData, typesData]) => {
        if (Array.isArray(routesData)) setRoutes(routesData);
        if (Array.isArray(typesData)) setTicketTypes(typesData);

        if (leg1RouteId) {
          setSelectedRouteId(leg1RouteId);
        } else if (defaultRouteId) {
          setSelectedRouteId(defaultRouteId);
        } else if (routesData.length > 0 && !selectedRouteId) {
          setSelectedRouteId(routesData[0].id);
        }

        if (presetTicketTypeId) {
          setSelectedTypeId(presetTicketTypeId);
        } else if (isTransferBooking) {
          const transferType = typesData.find((tt: any) => tt.id.includes('transfer') || tt.name.toLowerCase().includes('liên tuyến'));
          if (transferType) setSelectedTypeId(transferType.id);
          else if (typesData.length > 0) setSelectedTypeId(typesData[0].id);
        } else if (typesData.length > 0 && !selectedTypeId) {
          setSelectedTypeId(typesData[0].id);
        }
      })
      .catch(() => {});
  }, [defaultRouteId, leg1RouteId, isTransferBooking, presetTicketTypeId]);

  // Selected entities
  const selectedRoute = routes.find((r) => r.id === selectedRouteId || r.routeCode === selectedRouteId);
  const leg2Route = routes.find((r) => r.id === leg2RouteId || r.routeCode === leg2RouteId || r.routeCode === leg2Code);
  const selectedTicket = ticketTypes.find((tt) => tt.id === selectedTypeId);
  const totalAmount = (selectedTicket?.price || 0) * quantity;

  // Filtered routes for Step 1
  const filteredRoutes = useMemo(() => {
    const q = routeSearch.toLowerCase().trim();
    return routes.filter((r) => {
      // Category match
      if (routeCategory === 'VINBUS' && !r.routeCode.startsWith('E')) return false;
      if (routeCategory === 'AIRPORT' && !['07', '17', '68', '86', '86CT', '90', '109', 'E10'].includes(r.routeCode)) return false;
      if (routeCategory === 'INNER') {
        const num = parseInt(r.routeCode.replace(/\D/g, ''), 10);
        if (r.routeCode.startsWith('E') || num > 50) return false;
      }
      if (routeCategory === 'OUTER') {
        const num = parseInt(r.routeCode.replace(/\D/g, ''), 10);
        if (r.routeCode.startsWith('E') || num <= 50) return false;
      }

      if (!q) return true;
      const combined = `${r.routeCode} ${r.routeName} ${r.enterprise || ''} ${r.forwardPath || ''} ${r.backwardPath || ''}`.toLowerCase();
      return combined.includes(q);
    });
  }, [routes, routeSearch, routeCategory]);

  const handleStep1Next = () => {
    if (!selectedRouteId) {
      setError('Vui lòng chọn 1 tuyến xe buýt để tiếp tục.');
      return;
    }
    setError('');
    setCurrentStep(2);
  };

  const handleStep2Next = () => {
    if (!selectedTypeId || !selectedTicket) {
      setError('Vui lòng chọn 1 loại vé xe buýt phù hợp.');
      return;
    }
    if (!currentUser && !guestPhone.trim()) {
      setError('Vui lòng nhập số điện thoại để nhận mã vé điện tử.');
      return;
    }
    setError('');
    setCurrentStep(3);
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedRouteId || !selectedRoute) {
      setError('Vui lòng chọn tuyến xe buýt');
      setCurrentStep(1);
      return;
    }

    if (!selectedTypeId || !selectedTicket) {
      setError('Vui lòng chọn loại vé xe buýt trước khi thanh toán');
      setCurrentStep(2);
      return;
    }

    if (!currentUser && !guestPhone.trim()) {
      setError('Vui lòng nhập số điện thoại để nhận vé');
      setCurrentStep(2);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketTypeId: selectedTypeId,
          routeId: selectedRoute?.id || selectedRouteId,
          transferRouteId: leg2Route?.id || leg2RouteId,
          transferInfo: isTransferBooking ? {
            leg1Code: selectedRoute?.routeCode || leg1Code,
            leg2Code: leg2Route?.routeCode || leg2Code,
            transferHub: transferHub || 'Trạm trung chuyển',
          } : null,
          quantity,
          activationDate,
          guestPhone: guestPhone.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Không thể tạo đơn hàng');
      }

      // Redirect to payment screen
      router.push(`/payment/${data.order.orderCode}`);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tạo đơn hàng');
      setLoading(false);
    }
  };

  const steps = [
    { number: 1, title: 'Chọn tuyến xe', icon: Bus },
    { number: 2, title: 'Loại vé & Thông tin', icon: Ticket },
    { number: 3, title: 'Xác nhận thanh toán', icon: QrCode },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
      {/* Header */}
      <div className="mb-6 text-center">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
          {isTransferBooking ? 'Đặt mua vé xe buýt liên tuyến' : 'Đặt mua vé xe buýt điện tử'}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          {isTransferBooking
            ? `Áp dụng vé liên tuyến cho hành trình đổi xe: Tuyến ${selectedRoute?.routeCode || leg1Code} ➔ Tuyến ${leg2Route?.routeCode || leg2Code}`
            : 'Vé điện tử áp dụng cho mạng lưới 149 tuyến buýt Hà Nội • Thanh toán tiện lợi qua VietQR'}
        </p>
      </div>

      {/* 3-Step Wizard Progress Bar */}
      <div className="mb-8 max-w-3xl mx-auto">
        <div className="flex items-center justify-between relative">
          {/* Connector Line */}
          <div className="absolute left-10 right-10 top-1/2 -translate-y-1/2 h-1 bg-slate-200 z-0" />
          <div
            className="absolute left-10 top-1/2 -translate-y-1/2 h-1 bg-emerald-600 transition-all duration-300 z-0"
            style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
          />

          {steps.map((step) => {
            const Icon = step.icon;
            const isDone = currentStep > step.number;
            const isCurrent = currentStep === step.number;

            return (
              <div
                key={step.number}
                className="relative z-10 flex flex-col items-center cursor-pointer"
                onClick={() => {
                  if (step.number === 1) {
                    setError('');
                    setCurrentStep(1);
                  }
                  if (step.number === 2) {
                    if (!selectedRouteId) {
                      setError('Vui lòng chọn 1 tuyến xe buýt ở Bước 1 trước.');
                      return;
                    }
                    setError('');
                    setCurrentStep(2);
                  }
                  if (step.number === 3) {
                    if (!selectedRouteId) {
                      setError('Vui lòng chọn tuyến xe buýt trước.');
                      setCurrentStep(1);
                      return;
                    }
                    if (!selectedTypeId || !selectedTicket) {
                      setError('Vui lòng chọn loại vé trước khi sang bước thanh toán.');
                      setCurrentStep(2);
                      return;
                    }
                    if (!currentUser && !guestPhone.trim()) {
                      setError('Vui lòng nhập số điện thoại để nhận mã vé.');
                      setCurrentStep(2);
                      return;
                    }
                    setError('');
                    setCurrentStep(3);
                  }
                }}
              >
                <div
                  className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center font-bold text-xs sm:text-sm transition-all shadow-sm ${
                    isCurrent
                      ? 'bg-emerald-600 text-white ring-4 ring-emerald-100 scale-110'
                      : isDone
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white border-2 border-slate-300 text-slate-400'
                  }`}
                >
                  {isDone ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                </div>
                <span
                  className={`text-[11px] sm:text-xs font-semibold mt-2 ${
                    isCurrent ? 'text-emerald-700' : isDone ? 'text-slate-700' : 'text-slate-400'
                  }`}
                >
                  Bước {step.number}: {step.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="mb-6 max-w-3xl mx-auto p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm rounded-xl font-medium">
          {error}
        </div>
      )}

      {/* STEP 1: CHỌN TUYẾN XE BUÝT */}
      {currentStep === 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Bus className="w-5 h-5 text-emerald-600" />
                Bước 1: Chọn tuyến xe buýt cần mua vé
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Tìm kiếm theo số hiệu tuyến hoặc tên tuyến đường để chọn nhanh</p>
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Tìm mã tuyến (01, E01)..."
                value={routeSearch}
                onChange={(e) => setRouteSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 mb-6 pb-2 border-b border-slate-100">
            <Filter className="w-3.5 h-3.5 text-slate-400 mr-1 hidden sm:inline-block" />
            {[
              { id: 'ALL', label: 'Tất cả 149 tuyến' },
              { id: 'VINBUS', label: 'VinBus Điện (E)' },
              { id: 'AIRPORT', label: 'Tuyến Sân bay' },
              { id: 'INNER', label: 'Nội đô (01-50)' },
              { id: 'OUTER', label: 'Ngoại thành (>50)' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setRouteCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  routeCategory === cat.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Compact Route Grid */}
          {filteredRoutes.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              Không tìm thấy tuyến xe buýt phù hợp với "{routeSearch}".
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[420px] overflow-y-auto pr-1">
              {filteredRoutes.map((r) => {
                const isSelected = selectedRouteId === r.id || selectedRouteId === r.routeCode;
                const isElectric = r.routeCode.startsWith('E');

                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedRouteId(r.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/70 shadow-xs ring-2 ring-emerald-500/20'
                        : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50/80 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-11 h-11 rounded-xl font-extrabold text-sm flex items-center justify-center shrink-0 shadow-2xs ${
                          isElectric
                            ? 'bg-gradient-to-br from-teal-500 to-emerald-700 text-white'
                            : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {r.routeCode}
                      </span>
                      <div className="min-w-0">
                        <h3 className="font-bold text-slate-900 text-xs sm:text-sm leading-snug truncate" title={r.routeName}>
                          {r.routeName}
                        </h3>
                        <span className="text-[11px] text-slate-500 block truncate mt-0.5">
                          {r.price || '10.000đ/lượt'} • {r.stopCount || 20} trạm
                        </span>
                      </div>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                        isSelected ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Step 1 Actions */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between gap-4">
            <div className="text-xs text-slate-500">
              {selectedRoute ? (
                <span>
                  Đã chọn: <strong className="text-emerald-700">Tuyến {selectedRoute.routeCode} - {selectedRoute.routeName}</strong>
                </span>
              ) : (
                <span>Chưa chọn tuyến</span>
              )}
            </div>

            <button
              type="button"
              onClick={handleStep1Next}
              disabled={!selectedRouteId}
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md hover:shadow-lg disabled:opacity-40 transition-all cursor-pointer"
            >
              Tiếp tục: Chọn loại vé
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: CHỌN LOẠI VÉ & THÔNG TIN HÀNH KHÁCH */}
      {currentStep === 2 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          {/* Chosen Route Badge */}
          {isTransferBooking ? (
            <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-sky-50 via-emerald-50 to-sky-50 border-2 border-sky-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="w-9 h-9 rounded-xl bg-emerald-600 text-white font-extrabold text-xs flex items-center justify-center shadow-xs">
                    {selectedRoute?.routeCode || leg1Code}
                  </span>
                  <span className="text-sky-600 font-bold text-sm">➔</span>
                  <span className="w-9 h-9 rounded-xl bg-sky-600 text-white font-extrabold text-xs flex items-center justify-center shadow-xs">
                    {leg2Route?.routeCode || leg2Code}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-700 block">
                    🔄 Đang đặt Vé Liên Tuyến (Hành trình 2 xe)
                  </span>
                  <h3 className="font-bold text-slate-900 text-xs sm:text-sm leading-snug">
                    Tuyến {selectedRoute?.routeCode || leg1Code} ➔ Đổi tại [{transferHub || 'Trạm trung chuyển'}] ➔ Tuyến {leg2Route?.routeCode || leg2Code}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    1 mã QR vé liên tuyến hợp lệ để đi thông suốt cả 2 tuyến xe buýt
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="text-xs text-sky-700 hover:text-sky-900 font-semibold underline shrink-0"
              >
                Đổi tuyến khác
              </button>
            </div>
          ) : (
            selectedRoute && (
              <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-extrabold text-sm flex items-center justify-center shrink-0">
                    {selectedRoute.routeCode}
                  </span>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">Tuyến đã chọn</span>
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-snug">{selectedRoute.routeName}</h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold underline shrink-0"
                >
                  Đổi tuyến khác
                </button>
              </div>
            )
          )}

          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
            <Ticket className="w-5 h-5 text-emerald-600" />
            Bước 2: Chọn loại vé & Thông tin đặt vé
          </h2>

          {/* Ticket Types Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {ticketTypes.map((tt) => {
              const isSelected = selectedTypeId === tt.id;

              return (
                <label
                  key={tt.id}
                  className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                    isSelected
                      ? 'border-emerald-600 bg-emerald-50/70 shadow-xs ring-2 ring-emerald-500/20'
                      : 'border-slate-200 hover:bg-slate-50 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="ticketType"
                      value={tt.id}
                      checked={isSelected}
                      onChange={() => setSelectedTypeId(tt.id)}
                      className="mt-1 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{tt.name}</span>
                        {tt.is_student_price && (
                          <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded">
                            HSSV
                          </span>
                        )}
                      </div>
                      <span className="block text-xs text-slate-500 mt-0.5">
                        {tt.category === 'SINGLE_RIDE' && 'Hiệu lực 1 lượt di chuyển trong ngày'}
                        {tt.category === 'DAILY_PASS' && 'Đi lại không giới hạn trong 24 giờ'}
                        {tt.category === 'MONTHLY_PASS' && 'Đi lại không giới hạn trong 30 ngày'}
                      </span>
                    </div>
                  </div>
                  <span className="font-extrabold text-sm text-emerald-700 shrink-0">
                    {tt.price.toLocaleString('vi-VN')} đ
                  </span>
                </label>
              );
            })}
          </div>

          {/* Details Form Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                <Ticket className="w-3.5 h-3.5 text-slate-400" />
                Số lượng vé
              </label>
              <div className="flex items-center border border-slate-300 rounded-xl bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-8 h-8 rounded-lg bg-white border border-slate-200 font-bold text-slate-700 hover:bg-slate-100"
                >
                  -
                </button>
                <span className="flex-1 text-center font-bold text-sm text-slate-900">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                  className="w-8 h-8 rounded-lg bg-white border border-slate-200 font-bold text-slate-700 hover:bg-slate-100"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Ngày bắt đầu hiệu lực
              </label>
              <input
                type="date"
                value={activationDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => setActivationDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                Số điện thoại nhận vé
              </label>
              <input
                type="tel"
                placeholder="VD: 0901234567"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Step 2 Actions */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại Chọn tuyến
            </button>

            <button
              type="button"
              onClick={handleStep2Next}
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              Tiếp tục: Xem tổng tiền & Thanh toán
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: XÁC NHẬN & THANH TOÁN */}
      {currentStep === 3 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-6">
            <QrCode className="w-5 h-5 text-emerald-600" />
            Bước 3: Xác nhận đơn hàng & Tạo mã thanh toán VietQR
          </h2>

          {!selectedTicket && (
            <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs sm:text-sm font-medium flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span>⚠️ Bạn chưa chọn loại vé xe buýt! Vui lòng quay lại Bước 2 để chọn loại vé trước khi thanh toán.</span>
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shrink-0 cursor-pointer"
              >
                Quay lại chọn loại vé
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Order Breakdown Box */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
              <h3 className="font-bold text-slate-900 text-sm pb-2 border-b border-slate-200 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Thông tin vé chi tiết
              </h3>

              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-slate-500">Tuyến xe buýt:</span>
                <span className="font-bold text-slate-900 text-right">
                  {isTransferBooking
                    ? `Liên tuyến: Tuyến ${selectedRoute?.routeCode || leg1Code} ➔ Tuyến ${leg2Route?.routeCode || leg2Code}`
                    : `Tuyến ${selectedRoute?.routeCode} - ${selectedRoute?.routeName}`}
                </span>
              </div>

              {isTransferBooking && (
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-slate-500">Trạm chuyển tuyến:</span>
                  <span className="font-semibold text-sky-700 text-right">{transferHub || 'Điểm trung chuyển'}</span>
                </div>
              )}

              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-slate-500">Loại vé:</span>
                <span className={`font-semibold ${selectedTicket ? 'text-slate-900' : 'text-rose-600 italic'}`}>
                  {selectedTicket ? selectedTicket.name : 'Chưa chọn loại vé'}
                </span>
              </div>

              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-slate-500">Đơn giá:</span>
                <span className="font-semibold text-slate-700">
                  {selectedTicket ? `${selectedTicket.price.toLocaleString('vi-VN')} đ / vé` : '0 đ'}
                </span>
              </div>

              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-slate-500">Số lượng:</span>
                <span className="font-semibold text-slate-900">{quantity} vé</span>
              </div>

              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-slate-500">Ngày bắt đầu hiệu lực:</span>
                <span className="font-semibold text-slate-900">{activationDate}</span>
              </div>

              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-slate-500">Số điện thoại nhận vé:</span>
                <span className="font-semibold text-slate-900">{guestPhone || currentUser?.phone || 'Chưa có'}</span>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
                <span className="font-bold text-slate-900 text-sm">Tổng thanh toán:</span>
                <span className="font-extrabold text-xl text-emerald-700">{totalAmount.toLocaleString('vi-VN')} đ</span>
              </div>
            </div>

            {/* Payment Method Explanation */}
            <div className="flex flex-col justify-between space-y-4">
              <div className="bg-emerald-50/70 p-5 rounded-2xl border border-emerald-200/80 space-y-3">
                <h4 className="font-bold text-emerald-900 text-sm flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  Phương thức thanh toán tự động VietQR
                </h4>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Khi nhấn <strong>"Tạo mã thanh toán"</strong>, hệ thống sẽ tạo mã VietQR chuẩn NAPAS 24/7. Bạn chỉ cần mở ứng dụng ngân hàng bất kỳ (Vietcombank, MB, Techcombank...) để quét mã chuyển khoản.
                </p>
                <div className="space-y-1 text-[11px] text-emerald-700">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Tự động kích hoạt vé ngay sau 3-5 giây
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Xuất trình mã QR trên điện thoại khi lên xe
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-400 leading-relaxed italic">
                * Lưu ý: Vé xe buýt điện tử không hoàn hủy sau khi đã quét thanh toán thành công.
              </div>
            </div>
          </div>

          {/* Step 3 Actions */}
          <div className="pt-6 border-t border-slate-100 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại Bước 2
            </button>

            <button
              type="button"
              disabled={loading || !selectedTypeId || !selectedTicket || totalAmount <= 0}
              onClick={handleSubmitOrder}
              className="px-7 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm flex items-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer hover:scale-[1.02]"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Đang khởi tạo đơn hàng...
                </>
              ) : (
                <>
                  <QrCode className="w-4 h-4" />
                  Tạo mã thanh toán VietQR ({totalAmount.toLocaleString('vi-VN')} đ)
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-slate-500">Đang tải trang đặt vé...</div>}>
      <BookingContent />
    </Suspense>
  );
}
