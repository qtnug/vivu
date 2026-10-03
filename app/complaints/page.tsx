'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Send, CheckCircle2 } from 'lucide-react';

export default function ComplaintsPage() {
  const [routes, setRoutes] = useState<any[]>([]);
  const [category, setCategory] = useState('Thái độ phục vụ của nhân viên');
  const [routeId, setRouteId] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/routes')
      .then((res) => res.json())
      .then((data) => setRoutes(data))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!content.trim()) {
      setError('Vui lòng nhập nội dung phản ánh hoặc khiếu nại');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          routeId: routeId || null,
          content: content.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Lỗi khi gửi phản ánh');
      }

      setSuccess(true);
      setContent('');
    } catch (err: any) {
      setError(err.message || 'Lỗi gửi phản ánh');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Gửi phản ánh & Đóng góp ý kiến</h1>
            <p className="text-xs text-slate-500">
              Ý kiến của hành khách giúp nâng cao chất lượng dịch vụ xe buýt công cộng đô thị
            </p>
          </div>
        </div>

        {success ? (
          <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h3 className="text-base font-bold text-slate-900">Gửi phản ánh thành công!</h3>
            <p className="text-xs text-slate-600 max-w-sm mx-auto">
              Cảm ơn ý kiến đóng góp của bạn. Ban quản trị sẽ tiếp nhận và xử lý trong thời gian sớm nhất.
            </p>
            <button
              onClick={() => setSuccess(false)}
              className="mt-3 px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold"
            >
              Gửi thêm phản ánh khác
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Loại phản ánh</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Thái độ phục vụ của nhân viên">Thái độ phục vụ của nhân viên</option>
                <option value="Thời gian & lịch chạy xe buýt">Thời gian & lịch chạy xe buýt</option>
                <option value="Chất lượng phương tiện & vệ sinh">Chất lượng phương tiện & vệ sinh</option>
                <option value="Thanh toán & Vé điện tử">Thanh toán & Vé điện tử</option>
                <option value="Góp ý mở thêm tuyến / trạm dừng">Góp ý mở thêm tuyến / trạm dừng</option>
                <option value="Khác">Khác</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tuyến xe liên quan (tuỳ chọn)
              </label>
              <select
                value={routeId}
                onChange={(e) => setRouteId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- Không chọn tuyến cụ thể --</option>
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    Tuyến {r.routeCode} - {r.routeName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nội dung chi tiết <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={5}
                required
                placeholder="Vui lòng mô tả chi tiết sự việc, thời gian, biển số xe hoặc trạm dừng (nếu có)..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {loading ? 'Đang gửi...' : 'Gửi phản ánh ngay'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
