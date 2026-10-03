'use client';

import Link from 'next/link';
import { Bus, Phone, Mail, Clock, MapPin } from 'lucide-react';


export default function Footer() {
  return (
    <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 text-sm mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Col 1 */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-white font-bold text-lg">
              <div className="w-8 h-8 rounded bg-emerald-600 flex items-center justify-center text-white">
                <Bus className="w-5 h-5" />
              </div>
              <span>VIVU HÀ NỘI</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Hệ thống bán vé điện tử và quản lý vận tải hành khách công cộng bằng xe buýt. Mô hình bán vé lượt, vé ngày và vé tháng không chọn chỗ.
            </p>
          </div>

          {/* Col 2 */}
          <div className="space-y-2">
            <h4 className="text-white font-semibold text-sm">Thông tin hỗ trợ</h4>
            <ul className="space-y-1.5 text-xs">
              <li className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>Tổng đài: 1900 1234 (05:00 - 22:30)</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-emerald-400" />
                <span>hotro@busticket.vn</span>
              </li>
              <li className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Giờ xe chạy: 05:00 - 22:30 hàng ngày</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>Bến xe Long Biên, TP. Hà Nội</span>
              </li>
            </ul>
          </div>

          {/* Col 3 */}
          <div className="space-y-2">
            <h4 className="text-white font-semibold text-sm">Liên kết nhanh</h4>
            <ul className="space-y-1.5 text-xs">
              <li>
                <Link href="/routes" className="hover:text-emerald-400 transition-colors">
                  Bản đồ & Danh sách tuyến buýt
                </Link>
              </li>
              <li>
                <Link href="/booking" className="hover:text-emerald-400 transition-colors">
                  Mua vé lượt, vé ngày, vé tháng
                </Link>
              </li>
              <li>
                <Link href="/my-tickets" className="hover:text-emerald-400 transition-colors">
                  Tra cứu vé & Xuất trình QR khi lên xe
                </Link>
              </li>
              <li>
                <Link href="/complaints" className="hover:text-emerald-400 transition-colors">
                  Gửi phản ánh dịch vụ xe buýt
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4 */}
          <div className="space-y-2">
            <h4 className="text-white font-semibold text-sm">Cổng chuyên ngành</h4>
            <div className="flex flex-col gap-2 pt-1 text-xs">
              <Link
                href="/inspector"
                className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 flex items-center justify-between"
              >
                <span>Cổng Nhân viên Soát vé</span>
                <span className="text-[10px] bg-amber-950 px-1.5 py-0.5 rounded text-amber-200">Mobile</span>
              </Link>
              <Link
                href="/admin"
                className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 flex items-center justify-between"
              >
                <span>Cổng Quản trị Vận hành</span>
                <span className="text-[10px] bg-sky-950 px-1.5 py-0.5 rounded text-sky-200">Admin</span>
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <p>© 2026 Hệ thống Quản lý & Bán vé Xe buýt Điện tử Vivu. Mọi quyền được bảo lưu.</p>
          <p className="mt-2 sm:mt-0">Thiết kế phục vụ giao thông công cộng đô thị Việt Nam</p>
        </div>
      </div>
    </footer>
  );
}
