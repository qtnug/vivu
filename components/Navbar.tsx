'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bus, Ticket, QrCode, Shield, User, LogOut, Menu, X, MessageSquare, Compass } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) setCurrentUser(data.user);
        else setCurrentUser(null);
      })
      .catch(() => setCurrentUser(null));
  }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/auth/me', { method: 'DELETE' });
    setCurrentUser(null);
    router.push('/login');
  };

  const navLinks = [
    { name: 'Trang chủ', href: '/' },
    { name: 'Tra cứu tuyến', href: '/routes' },
    { name: 'Mua vé điện tử', href: '/booking' },
    { name: 'Vé của tôi', href: '/my-tickets' },
    { name: 'Gửi phản ánh', href: '/complaints' },
  ];

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-xl text-white shadow-sm">
              <Bus className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
                VIVU <span className="text-xs bg-emerald-800 text-emerald-200 px-2 py-0.5 rounded font-normal">Hà Nội Bus</span>
              </span>
              <p className="text-[11px] text-slate-400">Hệ thống xe buýt đô thị & Bán vé điện tử</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-slate-800 text-emerald-400 font-semibold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* User Actions */}
          <div className="hidden md:flex items-center space-x-3">
            {currentUser ? (
              <div className="flex items-center gap-3">
                {currentUser.role === 'admin' && (
                  <Link
                    href="/admin"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800 hover:bg-emerald-900 transition-colors"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    Trang Admin
                  </Link>
                )}
                {currentUser.role === 'inspector' && (
                  <Link
                    href="/inspector"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-950 text-amber-300 border border-amber-800 hover:bg-amber-900 transition-colors"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    Soát vé
                  </Link>
                )}
                <span className="text-xs text-slate-300 font-medium">
                  {currentUser.full_name} ({currentUser.role === 'admin' ? 'Admin' : currentUser.role === 'inspector' ? 'Soát vé' : 'Hành khách'})
                </span>
                <button
                  onClick={handleLogout}
                  className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
                  title="Đăng xuất"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  href="/login"
                  className="px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 rounded-md transition-colors"
                >
                  Đăng nhập
                </Link>
                <Link
                  href="/register"
                  className="px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-md transition-colors shadow-sm"
                >
                  Đăng ký
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 pt-2 pb-4 space-y-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              {link.name}
            </Link>
          ))}
          <div className="pt-2 border-t border-slate-800 flex flex-col gap-2">
            {currentUser && currentUser.role === 'admin' && (
              <Link
                href="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center py-2 rounded text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center justify-center gap-1.5"
              >
                <Shield className="w-3.5 h-3.5" />
                Trang Quản trị Admin
              </Link>
            )}
            {currentUser && currentUser.role === 'inspector' && (
              <Link
                href="/inspector"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center py-2 rounded text-xs font-semibold bg-amber-950 text-amber-300 border border-amber-800 flex items-center justify-center gap-1.5"
              >
                <QrCode className="w-3.5 h-3.5" />
                Cổng Soát vé
              </Link>
            )}
            {currentUser ? (
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm text-slate-300">{currentUser.full_name}</span>
                <button
                  onClick={handleLogout}
                  className="text-xs text-red-400 font-medium px-3 py-1 bg-slate-800 rounded"
                >
                  Đăng xuất
                </button>
              </div>
            ) : (

              <div className="grid grid-cols-2 gap-2 pt-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center py-2 bg-slate-800 text-white rounded text-sm"
                >
                  Đăng nhập
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-center py-2 bg-emerald-600 text-white rounded text-sm font-medium"
                >
                  Đăng ký
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
