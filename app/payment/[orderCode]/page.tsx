'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Clock, Copy, Check, AlertCircle, ArrowRight, RefreshCw, QrCode } from 'lucide-react';

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const orderCode = params?.orderCode as string;

  const [order, setOrder] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState<number>(15 * 60);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [loading, setLoading] = useState(true);

  // Poll order status
  useEffect(() => {
    if (!orderCode) return;

    let intervalId: any;

    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/orders/${orderCode}`);
        const data = await res.json();
        if (res.ok) {
          setOrder(data);
          setLoading(false);

          // Calculate remaining seconds
          const expiryTime = new Date(data.expiresAt).getTime();
          const remaining = Math.max(0, Math.floor((expiryTime - Date.now()) / 1000));
          setTimeLeft(remaining);

          if (data.status === 'PAID') {
            clearInterval(intervalId);
          }
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchOrder();
    intervalId = setInterval(fetchOrder, 3000);

    return () => clearInterval(intervalId);
  }, [orderCode]);

  // Countdown timer tick
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSimulateWebhook = async () => {
    if (!order) return;
    setSimulating(true);
    try {
      const res = await fetch('/api/webhooks/sepay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Apikey VIVU_SEPAY_SECRET_TOKEN_2026',
        },
        body: JSON.stringify({
          transferAmount: order.totalAmount,
          content: `VIVU CK ${order.orderCode}`,
          referenceCode: `SIM-${Date.now()}`,
        }),
      });

      if (res.ok) {
        // Fetch updated status
        const updated = await fetch(`/api/orders/${orderCode}`).then((r) => r.json());
        setOrder(updated);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSimulating(false);
    }
  };

  const handleRegenerate = async () => {
    if (!order) return;
    try {
      const res = await fetch(`/api/orders/${order.id}/regenerate`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        router.push(`/payment/${data.order.order_code}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="text-center py-20 text-slate-500">Đang khởi tạo mã thanh toán VietQR...</div>;
  }

  if (!order || order.error) {
    return (
      <div className="max-w-md mx-auto py-20 px-4 text-center">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Không tìm thấy đơn hàng</h2>
        <p className="text-sm text-slate-600 mb-6">Đơn hàng không tồn tại hoặc đã bị hủy.</p>
        <Link href="/booking" className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium">
          Tạo đơn hàng mới
        </Link>
      </div>
    );
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isPaid = order.status === 'PAID';
  const isExpired = order.status === 'EXPIRED' || timeLeft <= 0;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
      {/* Status Banner */}
      {isPaid ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 sm:p-8 text-center mb-8 shadow-sm">
          <div className="w-16 h-16 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <span className="text-xs uppercase font-bold tracking-wider text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
            Giao dịch thành công
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">Thanh toán vé thành công!</h1>
          <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
            Hệ thống đã tự động xuất {order.quantity} vé điện tử với mã QR bảo mật JWT. Bạn có thể xuất trình vé ngay khi lên xe buýt.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/my-tickets"
              className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow transition-colors flex items-center justify-center gap-2"
            >
              <QrCode className="w-4 h-4" />
              Mở Vé của tôi (Xem mã QR)
            </Link>
            <Link
              href="/"
              className="w-full sm:w-auto px-5 py-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-xl transition-colors"
            >
              Về trang chủ
            </Link>
          </div>
        </div>
      ) : isExpired ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 sm:p-8 text-center mb-8 shadow-sm">
          <div className="w-16 h-16 bg-rose-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow">
            <AlertCircle className="w-10 h-10" />
          </div>
          <span className="text-xs uppercase font-bold tracking-wider text-rose-700 bg-rose-100 px-3 py-1 rounded-full">
            Đơn hàng đã hết hạn
          </span>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">Đã quá thời gian thanh toán</h1>
          <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
            Mã thanh toán cho đơn hàng {order.orderCode} đã hết hiệu lực 15 phút. Vui lòng bấm bên dưới để tạo lại mã thanh toán mới.
          </p>
          <div className="mt-6">
            <button
              onClick={handleRegenerate}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow transition-colors inline-flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Tạo lại mã thanh toán mới
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 mb-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded">
                Chờ thanh toán qua VietQR
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">Đơn hàng: {order.orderCode}</h1>
              <p className="text-xs text-slate-500">
                {order.ticketTypeName} • Tuyến {order.routeCode} ({order.quantity} vé)
              </p>
            </div>

            {/* Countdown Badge */}
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
              <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
              <div className="text-right">
                <span className="text-[11px] block font-medium leading-none">Hiệu lực còn lại</span>
                <span className="text-base font-black font-mono">
                  {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 items-center">
            {/* Dynamic VietQR Image */}
            <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
              <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-100 mb-3">
                <img
                  src={order.payment.qrImageUrl}
                  alt={`VietQR ${order.orderCode}`}
                  className="w-56 h-56 object-contain"
                />
              </div>
              <p className="text-xs text-slate-500 max-w-xs">
                Mở ứng dụng Ngân hàng (MB, VCB, Techcombank, VPBank...) để quét mã thanh toán tự động
              </p>
            </div>

            {/* Transfer Details with Copy Buttons */}
            <div className="space-y-3.5">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 block">Ngân hàng thụ hưởng</span>
                  <span className="text-sm font-bold text-slate-900">{order.payment.bankName}</span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(order.payment.bankName, 'bank')}
                  className="text-slate-500 hover:text-slate-800 p-1.5"
                  title="Sao chép"
                >
                  {copiedField === 'bank' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 block">Số tài khoản</span>
                  <span className="text-base font-mono font-bold text-slate-900">{order.payment.accountNo}</span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(order.payment.accountNo, 'acc')}
                  className="text-slate-500 hover:text-slate-800 p-1.5"
                  title="Sao chép"
                >
                  {copiedField === 'acc' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-400 block">Tên chủ tài khoản</span>
                <span className="text-xs font-bold text-slate-900 uppercase">{order.payment.accountName}</span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 block">Số tiền chính xác</span>
                  <span className="text-lg font-black text-emerald-600">
                    {order.totalAmount.toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(String(order.totalAmount), 'amount')}
                  className="text-slate-500 hover:text-slate-800 p-1.5"
                  title="Sao chép"
                >
                  {copiedField === 'amount' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-amber-700 block font-semibold">Nội dung chuyển khoản (bắt buộc)</span>
                  <span className="text-base font-mono font-black text-slate-900">{order.orderCode}</span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(order.orderCode, 'content')}
                  className="text-amber-800 hover:text-amber-950 p-1.5"
                  title="Sao chép"
                >
                  {copiedField === 'content' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Quick Demo Simulator for user evaluation */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl">
            <div>
              <p className="text-xs font-semibold text-slate-800">Kiểm thử nghiệm thu trực tiếp:</p>
              <p className="text-[11px] text-slate-500">
                Bấm nút bên cạnh để mô phỏng Webhook SePay bắn xác nhận chuyển khoản cho đơn hàng này ngay tức thì.
              </p>
            </div>
            <button
              onClick={handleSimulateWebhook}
              disabled={simulating}
              className="whitespace-nowrap px-4 py-2 bg-slate-900 hover:bg-slate-800 text-emerald-400 font-mono text-xs font-bold rounded-lg border border-slate-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${simulating ? 'animate-spin' : ''}`} />
              {simulating ? 'Đang gửi Webhook...' : 'Mô phỏng SePay Webhook ngay'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
