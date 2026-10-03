'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bus, LogIn, Shield, QrCode, User, Lock, Mail, ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');


  const handleLogin = async (loginEmail?: string, loginPassword?: string) => {
    setError('');
    setLoading(true);

    const targetEmail = loginEmail || email;
    const targetPassword = loginPassword || password;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, password: targetPassword }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Đăng nhập thất bại');
      }

      // Route based on role
      if (data.user.role === 'admin') {
        router.push('/admin');
      } else if (data.user.role === 'inspector') {
        router.push('/inspector');
      } else {
        router.push('/my-tickets');
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi đăng nhập');
      setLoading(false);
    }
  };

  const handleQuickLogin = (role: 'admin' | 'inspector' | 'passenger') => {
    if (role === 'admin') {
      setEmail('admin@busticket.vn');
      setPassword('Admin@123456');
      handleLogin('admin@busticket.vn', 'Admin@123456');
    } else if (role === 'inspector') {
      setEmail('inspector1@busticket.vn');
      setPassword('Inspector@123456');
      handleLogin('inspector1@busticket.vn', 'Inspector@123456');
    } else {
      setEmail('passenger@busticket.vn');
      setPassword('Passenger@123456');
      handleLogin('passenger@busticket.vn', 'Passenger@123456');
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12 flex-1 flex flex-col justify-center">
      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center mx-auto mb-3 shadow-sm">
            <Bus className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Đăng nhập tài khoản</h1>
          <p className="text-xs text-slate-500 mt-1">Dành cho Hành khách, Nhân viên soát vé và Quản trị viên</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLogin();
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email hoặc Số điện thoại</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                placeholder="VD: admin@busticket.vn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Mật khẩu</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>


          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-lg shadow transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <LogIn className="w-4 h-4" />
            {loading ? 'Đang xác thực...' : 'Đăng nhập'}
          </button>
        </form>

        {/* Quick Demo Logins */}
        <div className="mt-6 pt-6 border-t border-slate-100">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2 text-center">
            Đăng nhập nhanh 1 chạm (Tài khoản mẫu):
          </p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin')}
              className="py-1.5 px-2 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-lg text-[11px] font-bold transition-colors"
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('inspector')}
              className="py-1.5 px-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[11px] font-bold transition-colors"
            >
              Soát vé
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('passenger')}
              className="py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-bold transition-colors"
            >
              Hành khách
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          Chưa có tài khoản?{' '}
          <Link href="/register" className="text-emerald-700 font-bold hover:underline">
            Đăng ký tài khoản hành khách
          </Link>
        </p>
      </div>
    </div>
  );
}
