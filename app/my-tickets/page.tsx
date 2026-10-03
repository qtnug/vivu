'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Ticket, QrCode, Search, Clock, CheckCircle2, AlertCircle, X, ExternalLink, Calendar } from 'lucide-react';

export default function MyTicketsPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'USED' | 'EXPIRED'>('ALL');
  const [loading, setLoading] = useState(true);

  // Guest lookup state
  const [guestLookupOpen, setGuestLookupOpen] = useState(false);
  const [lookupOrderCode, setLookupOrderCode] = useState('');
  const [lookupPhone, setLookupPhone] = useState('');
  const [lookupError, setLookupError] = useState('');

  // Selected QR modal
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const fetchTickets = () => {
    setLoading(true);
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setCurrentUser(data.user);
          return fetch('/api/tickets/me').then((r) => r.json());
        } else {
          setCurrentUser(null);
          setGuestLookupOpen(true);
          return [];
        }
      })
      .then((ticketList) => {
        setTickets(Array.isArray(ticketList) ? ticketList : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleGuestLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLookupError('');
    if (!lookupOrderCode.trim() && !lookupPhone.trim()) {
      setLookupError('Vui lòng nhập mã đơn hàng hoặc số điện thoại');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (lookupOrderCode.trim()) params.set('orderCode', lookupOrderCode.trim());
      if (lookupPhone.trim()) params.set('phone', lookupPhone.trim());

      const res = await fetch(`/api/tickets/lookup?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Không tìm thấy vé');
      }

      setTickets(data);
    } catch (err: any) {
      setLookupError(err.message || 'Lỗi tra cứu vé');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenQrModal = async (ticket: any) => {
    setSelectedTicket(ticket);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`);
      const data = await res.json();
      if (data.qrDataUrl) {
        setQrDataUrl(data.qrDataUrl);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredTickets = tickets.filter((t) => {
    if (statusFilter === 'ALL') return true;
    return t.status === statusFilter;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vé xe buýt điện tử của tôi</h1>
          <p className="text-sm text-slate-500">
            {currentUser
              ? `Tài khoản: ${currentUser.full_name} (${currentUser.email || currentUser.phone})`
              : 'Tra cứu vé không cần đăng nhập theo mã đơn hàng hoặc số điện thoại'}
          </p>
        </div>

        <div className="flex gap-2">
          {!currentUser && (
            <button
              onClick={() => setGuestLookupOpen(!guestLookupOpen)}
              className="px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 shadow-sm"
            >
              <Search className="w-3.5 h-3.5" />
              Tra cứu vé khách
            </button>
          )}
          <Link
            href="/booking"
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-sm transition-colors flex items-center gap-1.5"
          >
            <Ticket className="w-3.5 h-3.5" />
            Mua thêm vé mới
          </Link>
        </div>
      </div>

      {/* Guest Lookup Box */}
      {(!currentUser || guestLookupOpen) && (
        <div className="mb-8 p-5 bg-white border border-slate-200 rounded-xl shadow-sm">
          <h2 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
            <Search className="w-4 h-4 text-emerald-600" />
            Tra cứu vé cho hành khách mua vé dạng khách (Guest Checkout)
          </h2>
          <form onSubmit={handleGuestLookup} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Mã đơn hàng (VD: DH...)</label>
              <input
                type="text"
                placeholder="Nhập mã đơn hàng"
                value={lookupOrderCode}
                onChange={(e) => setLookupOrderCode(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs uppercase font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Số điện thoại mua vé</label>
              <input
                type="tel"
                placeholder="09xx xxx xxx"
                value={lookupPhone}
                onChange={(e) => setLookupPhone(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full py-2 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition-colors"
              >
                Tra cứu ngay
              </button>
            </div>
          </form>
          {lookupError && <p className="text-xs text-rose-600 mt-2 font-medium">{lookupError}</p>}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex border-b border-slate-200 mb-6 space-x-2">
        {(['ALL', 'ACTIVE', 'USED', 'EXPIRED'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={`py-2 px-4 text-xs font-bold border-b-2 transition-colors ${
              statusFilter === tab
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab === 'ALL'
              ? `Tất cả (${tickets.length})`
              : tab === 'ACTIVE'
              ? `Đang hiệu lực (${tickets.filter((t) => t.status === 'ACTIVE').length})`
              : tab === 'USED'
              ? `Đã sử dụng (${tickets.filter((t) => t.status === 'USED').length})`
              : `Hết hạn (${tickets.filter((t) => t.status === 'EXPIRED').length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-500 text-sm">Đang tải danh sách vé...</div>
      ) : filteredTickets.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-slate-200 shadow-sm">
          <Ticket className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 mb-1">Chưa có vé xe buýt nào</h3>
          <p className="text-xs text-slate-500 mb-6">
            Bạn chưa có vé nào trong mục này hoặc chưa tiến hành tra cứu.
          </p>
          <Link href="/booking" className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-xs font-bold shadow">
            Mua vé xe buýt ngay
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTickets.map((t) => {
            const isActive = t.status === 'ACTIVE';
            const isUsed = t.status === 'USED';
            const isExpired = t.status === 'EXPIRED';

            return (
              <div
                key={t.id}
                className={`bg-white rounded-2xl border transition-shadow shadow-sm overflow-hidden flex flex-col justify-between ${
                  isActive
                    ? 'border-emerald-300 ring-1 ring-emerald-500/20'
                    : 'border-slate-200 opacity-90'
                }`}
              >
                {/* Header */}
                <div className={`p-4 border-b ${isActive ? 'bg-emerald-50/70 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {t.ticket_code}
                    </span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        isActive
                          ? 'bg-emerald-600 text-white'
                          : isUsed
                          ? 'bg-slate-200 text-slate-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {isActive ? 'ĐANG HIỆU LỰC' : isUsed ? 'ĐÃ SỬ DỤNG' : 'HẾT HẠN'}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-slate-900 text-base">{t.ticket_type_name || 'Vé xe buýt'}</h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Tuyến {t.route_code || '01'}: {t.route_name || 'Hà Nội'}
                  </p>
                </div>

                {/* Body info */}
                <div className="p-4 space-y-2 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Hiệu lực đến:</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {new Date(t.valid_until).toLocaleString('vi-VN')}
                    </span>
                  </div>
                  {isUsed && t.used_at && (
                    <div className="flex items-center justify-between text-amber-700">
                      <span>Đã soát lúc:</span>
                      <span className="font-mono font-semibold">
                        {new Date(t.used_at).toLocaleString('vi-VN')}
                      </span>
                    </div>
                  )}
                </div>

                {/* QR Action */}
                <div className="p-4 pt-2 border-t border-slate-100 bg-slate-50/50">
                  <button
                    onClick={() => handleOpenQrModal(t)}
                    className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-colors ${
                      isActive
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                        : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    {isActive ? 'Mở mã QR soát vé' : 'Xem lại mã vé'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* QR Code Pop-up Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setSelectedTicket(null)}
              className="absolute right-4 top-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
              Vé điện tử xe buýt
            </span>
            <h2 className="text-xl font-black text-slate-900 mt-2">{selectedTicket.ticket_type_name}</h2>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{selectedTicket.ticket_code}</p>

            <div className="my-6 p-4 bg-white border border-slate-200 rounded-xl inline-block shadow-inner">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Mã QR vé" className="w-56 h-56 object-contain mx-auto" />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-xs text-slate-400">
                  Đang tạo mã QR...
                </div>
              )}
            </div>

            <p className="text-xs text-slate-600 mb-2">
              Xuất trình mã QR này cho nhân viên soát vé quét khi bước lên xe.
            </p>
            <p className="text-[11px] text-slate-400 font-mono">
              Hiệu lực đến: {new Date(selectedTicket.valid_until).toLocaleString('vi-VN')}
            </p>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <button
                onClick={() => setSelectedTicket(null)}
                className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
