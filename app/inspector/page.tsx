'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { QrCode, CheckCircle2, AlertTriangle, XCircle, Camera, Keyboard, History, Shield, RefreshCw, Volume2, UserCheck } from 'lucide-react';

export default function InspectorPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [mode, setMode] = useState<'SCAN' | 'MANUAL' | 'HISTORY'>('SCAN');
  const [manualCode, setManualCode] = useState('');
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [inspectionHistory, setInspectionHistory] = useState<any[]>([]);
  const [verifying, setVerifying] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) setCurrentUser(data.user);
      })
      .catch(() => {})
      .finally(() => setAuthLoading(false));
  }, []);


  const handleVerify = async (codeOrPayload: string) => {
    if (!codeOrPayload.trim()) return;
    setVerifying(true);
    setErrorMsg('');
    setVerificationResult(null);

    try {
      const isJwt = codeOrPayload.includes('.') && codeOrPayload.split('.').length === 3;
      const res = await fetch('/api/tickets/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isJwt ? { qrPayload: codeOrPayload.trim() } : { ticketCode: codeOrPayload.trim() }
        ),
      });

      const data = await res.json();
      setVerificationResult(data);

      // Play audio feedback
      if (typeof window !== 'undefined' && 'AudioContext' in window) {
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = data.valid ? 880 : 330;
          gain.gain.setValueAtTime(0.1, ctx.currentTime);
          osc.start();
          osc.stop(ctx.currentTime + (data.valid ? 0.2 : 0.4));
        } catch {}
      }

      // Add to shift history
      setInspectionHistory((prev) => [
        {
          id: Date.now(),
          ticketCode: data.ticket?.ticket_code || codeOrPayload,
          valid: data.valid,
          reason: data.reason || 'Hợp lệ',
          ticketTypeName: data.ticket?.ticket_type_name,
          time: new Date().toLocaleTimeString('vi-VN'),
        },
        ...prev,
      ]);
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi kết nối khi soát vé');
    } finally {
      setVerifying(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      handleVerify(manualCode.trim());
    }
  };

  // Quick test demo helper
  const handleScanSampleActive = () => {
    handleVerify('TICK-DEMO-001');
  };

  if (authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-slate-500 text-sm animate-pulse">
        Đang kiểm tra quyền soát vé...
      </div>
    );
  }

  if (!currentUser || (currentUser.role !== 'inspector' && currentUser.role !== 'admin')) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 flex-1 flex flex-col justify-center">
        <div className="bg-white rounded-2xl border border-amber-200 p-8 shadow-sm text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Quyền truy cập bị hạn chế</h2>
          <p className="text-xs text-slate-600 mb-6 leading-relaxed">
            Khu vực này chỉ dành riêng cho <strong>Nhân viên Soát vé</strong> và <strong>Quản trị viên</strong> của Vivu Bus. Vui lòng đăng nhập với tài khoản được cấp quyền.
          </p>
          <div className="space-y-2">
            <Link
              href="/login"
              className="block w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
            >
              Đăng nhập tài khoản Soát vé / Admin
            </Link>
            <Link
              href="/"
              className="block w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
            >
              Quay lại Trang chủ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-6 flex-1 flex flex-col">

      {/* Mobile Header */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-md mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs bg-amber-900/80 text-amber-300 px-2 py-0.5 rounded font-mono font-bold">
              SOÁT VÉ XE BUÝT
            </span>
            <h1 className="text-base font-bold leading-tight mt-0.5">
              {currentUser?.full_name || 'Nhân viên Soát vé'}
            </h1>
          </div>
        </div>

        <span className="text-[11px] text-slate-400 font-mono bg-slate-800 px-2 py-1 rounded">
          Ca trực hôm nay
        </span>
      </div>

      {/* Mode Navigation Tabs */}
      <div className="grid grid-cols-3 gap-2 mb-4 bg-slate-200 p-1 rounded-xl text-xs font-bold text-slate-700">
        <button
          onClick={() => {
            setMode('SCAN');
            setVerificationResult(null);
          }}
          className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            mode === 'SCAN' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          Camera QR
        </button>
        <button
          onClick={() => {
            setMode('MANUAL');
            setVerificationResult(null);
          }}
          className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            mode === 'MANUAL' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'
          }`}
        >
          <Keyboard className="w-3.5 h-3.5" />
          Nhập tay
        </button>
        <button
          onClick={() => setMode('HISTORY')}
          className={`py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            mode === 'HISTORY' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          Lịch sử ({inspectionHistory.length})
        </button>
      </div>

      {/* Main Verification Card */}
      {verificationResult ? (
        <div
          className={`rounded-2xl p-6 text-center border-2 shadow-lg mb-6 animate-in zoom-in-95 duration-200 ${
            verificationResult.valid
              ? 'bg-emerald-600 border-emerald-500 text-white'
              : 'bg-rose-600 border-rose-500 text-white'
          }`}
        >
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            {verificationResult.valid ? (
              <CheckCircle2 className="w-12 h-12 text-white" />
            ) : (
              <XCircle className="w-12 h-12 text-white" />
            )}
          </div>

          <span className="text-xs uppercase font-black tracking-widest bg-black/20 px-3 py-1 rounded-full">
            {verificationResult.valid ? 'VÉ HỢP LỆ — MỜI LÊN XE' : 'VÉ KHÔNG HỢP LỆ'}
          </span>

          <h2 className="text-2xl font-black mt-3">
            {verificationResult.valid ? 'XÁC NHẬN SOÁT VÉ' : verificationResult.reason || 'Vé không sử dụng được'}
          </h2>

          {verificationResult.ticket && (
            <div className="bg-black/15 rounded-xl p-4 mt-4 text-left space-y-1.5 text-xs text-white/90">
              <div className="flex justify-between">
                <span>Mã vé:</span>
                <span className="font-mono font-bold text-white">{verificationResult.ticket.ticket_code}</span>
              </div>
              <div className="flex justify-between">
                <span>Loại vé:</span>
                <span className="font-bold text-white">{verificationResult.ticket.ticket_type_name || 'Vé ngày'}</span>
              </div>
              <div className="flex justify-between">
                <span>Tuyến:</span>
                <span>{verificationResult.ticket.route_name || 'Tuyến 01 Long Biên - Hà Đông'}</span>
              </div>
              <div className="flex justify-between">
                <span>Thời hạn đến:</span>
                <span className="font-mono">
                  {new Date(verificationResult.ticket.valid_until).toLocaleString('vi-VN')}
                </span>
              </div>
              {verificationResult.ticket.status === 'USED' && (
                <div className="flex justify-between text-amber-200 font-semibold pt-1 border-t border-white/10">
                  <span>Trạng thái:</span>
                  <span>Đã đánh dấu ĐÃ SỬ DỤNG</span>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 flex gap-2">
            <button
              onClick={() => {
                setVerificationResult(null);
                setManualCode('');
              }}
              className="flex-1 py-3 bg-white text-slate-900 font-black rounded-xl text-sm shadow hover:bg-slate-100 transition-colors"
            >
              Tiếp tục soát khách tiếp theo
            </button>
          </div>
        </div>
      ) : mode === 'SCAN' ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-6 flex-1 flex flex-col justify-between">
          <div className="text-center">
            <h2 className="font-bold text-slate-900 text-base mb-1">Màn hình quét mã QR vé</h2>
            <p className="text-xs text-slate-500 mb-6">
              Hướng camera điện thoại vào mã QR vé của hành khách trên ứng dụng hoặc vé in
            </p>

            {/* Simulated Camera Viewfinder */}
            <div className="relative w-64 h-64 mx-auto rounded-2xl bg-slate-900 border-2 border-dashed border-emerald-500 flex flex-col items-center justify-center overflow-hidden shadow-inner mb-4">
              <div className="w-48 h-48 border-2 border-emerald-400 rounded-xl relative flex items-center justify-center">
                {/* Corner markers */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-emerald-400" />
                {/* Scanning laser line animation */}
                <div className="w-full h-0.5 bg-emerald-400 absolute top-1/2 shadow-[0_0_8px_#10b981] animate-pulse" />
                <QrCode className="w-16 h-16 text-slate-700" />
              </div>
              <span className="text-[11px] text-emerald-300 mt-2 font-mono">Camera đang sẵn sàng</span>
            </div>

            <p className="text-xs text-slate-500">Giữ camera ổn định khoảng cách 15 - 25cm</p>
          </div>

          <div className="space-y-2 pt-4 border-t border-slate-100">
            <button
              onClick={handleScanSampleActive}
              disabled={verifying}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition-colors flex items-center justify-center gap-2"
            >
              <UserCheck className="w-4 h-4" />
              {verifying ? 'Đang giải mã JWT...' : 'Quét vé mẫu hợp lệ (Demo QR)'}
            </button>
            <button
              onClick={() => handleVerify('TICK-INVALID-999')}
              disabled={verifying}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
            >
              Thử quét vé không tồn tại (Kiểm tra chặn vé giả)
            </button>
          </div>
        </div>
      ) : mode === 'MANUAL' ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-6 flex-1 flex flex-col justify-between">
          <div>
            <h2 className="font-bold text-slate-900 text-base mb-1">Nhập thủ công mã vé</h2>
            <p className="text-xs text-slate-500 mb-6">
              Áp dụng trong trường hợp điện thoại khách bị mờ camera hoặc rách mã QR
            </p>

            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mã vé (VD: TICK-DEMO-001)</label>
                <input
                  type="text"
                  required
                  placeholder="Nhập mã vé in trên thẻ..."
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-base font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <button
                type="submit"
                disabled={verifying}
                className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm rounded-xl shadow transition-colors flex items-center justify-center gap-2"
              >
                {verifying ? 'Đang kiểm tra...' : 'Xác thực mã vé ngay'}
              </button>
            </form>
          </div>

          <div className="pt-4 border-t border-slate-100 text-center">
            <span className="text-xs text-slate-400">Mã vé hợp lệ có sẵn: </span>
            <button
              type="button"
              onClick={() => setManualCode('TICK-DEMO-001')}
              className="text-xs font-mono font-bold text-emerald-700 hover:underline"
            >
              TICK-DEMO-001
            </button>
          </div>
        </div>
      ) : (
        /* History Mode */
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-6 flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <h2 className="font-bold text-slate-900 text-base">Lịch sử vé đã soát trong ca</h2>
            <span className="text-xs text-slate-500 font-mono">{inspectionHistory.length} lượt</span>
          </div>

          {inspectionHistory.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs my-auto">
              Chưa có lượt soát vé nào trong ca làm việc này.
            </div>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-96 pr-1">
              {inspectionHistory.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                    item.valid
                      ? 'bg-emerald-50/60 border-emerald-200'
                      : 'bg-rose-50/60 border-rose-200'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900">{item.ticketCode}</span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          item.valid ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                        }`}
                      >
                        {item.valid ? 'HỢP LỆ' : 'TỪ CHỐI'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{item.reason}</p>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">{item.time}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {errorMsg && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl text-center">
          {errorMsg}
        </div>
      )}
    </div>
  );
}
