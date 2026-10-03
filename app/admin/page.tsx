'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  Bus,
  Clock,
  Ticket,
  Receipt,
  MessageSquare,
  Users,
  Plus,
  Trash2,
  Edit,
  TrendingUp,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Eye,
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Check,
  CheckCircle2,
  Calendar,
} from 'lucide-react';

// Common Pagination Helper Component
function PaginationControls({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers to show
  const pageNumbers: (number | string)[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
  } else {
    pageNumbers.push(1);
    if (currentPage > 3) pageNumbers.push('...');
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pageNumbers.push(i);
    if (currentPage < totalPages - 2) pageNumbers.push('...');
    pageNumbers.push(totalPages);
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 text-xs text-slate-500">
      <div>
        Hiển thị <strong className="text-slate-800">{startItem}</strong> - <strong className="text-slate-800">{endItem}</strong> trong tổng số <strong className="text-slate-800">{totalItems}</strong> mục
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {pageNumbers.map((p, idx) =>
          typeof p === 'number' ? (
            <button
              key={idx}
              type="button"
              onClick={() => onPageChange(p)}
              className={`w-7 h-7 rounded-lg font-semibold text-xs transition-colors ${
                currentPage === p
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {p}
            </button>
          ) : (
            <span key={idx} className="px-1 text-slate-400">
              {p}
            </span>
          )
        )}

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<
    'DASHBOARD' | 'ROUTES' | 'TICKETS' | 'BUSES' | 'SCHEDULES' | 'ORDERS' | 'STAFF' | 'COMPLAINTS'
  >('DASHBOARD');

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [routes, setRoutes] = useState<any[]>([]);
  const [ticketTypes, setTicketTypes] = useState<any[]>([]);
  const [buses, setBuses] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Pagination states (page sizes = 10)
  const pageSize = 10;
  const [routesPage, setRoutesPage] = useState(1);
  const [ticketsPage, setTicketsPage] = useState(1);
  const [busesPage, setBusesPage] = useState(1);
  const [schedulesPage, setSchedulesPage] = useState(1);
  const [ordersPage, setOrdersPage] = useState(1);
  const [staffPage, setStaffPage] = useState(1);
  const [complaintsPage, setComplaintsPage] = useState(1);

  // Search states
  const [routeSearch, setRouteSearch] = useState('');
  const [ticketSearch, setTicketSearch] = useState('');
  const [busSearch, setBusSearch] = useState('');
  const [scheduleFilterRoute, setScheduleFilterRoute] = useState('');
  const [orderSearch, setOrderSearch] = useState('');

  // Modals & Forms State
  const [modalType, setModalType] = useState<
    'CREATE_ROUTE' | 'EDIT_ROUTE' | 'CREATE_TICKET' | 'EDIT_TICKET' | 'CREATE_BUS' | 'EDIT_BUS' | 'CREATE_SCHEDULE' | 'EDIT_SCHEDULE' | 'CREATE_STAFF' | null
  >(null);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Form inputs
  const [formRouteCode, setFormRouteCode] = useState('');
  const [formRouteName, setFormRouteName] = useState('');
  const [formRouteDirection, setFormRouteDirection] = useState<'FORWARD' | 'BACKWARD'>('FORWARD');
  const [formRouteEnterprise, setFormRouteEnterprise] = useState('');
  const [formRouteOperatingHours, setFormRouteOperatingHours] = useState('');
  const [formRoutePrice, setFormRoutePrice] = useState('');
  const [formRouteInterval, setFormRouteInterval] = useState('');
  const [formRouteDescription, setFormRouteDescription] = useState('');

  const [formTicketCategory, setFormTicketCategory] = useState<'SINGLE_RIDE' | 'DAILY_PASS' | 'MONTHLY_PASS'>('SINGLE_RIDE');
  const [formTicketName, setFormTicketName] = useState('');
  const [formTicketPrice, setFormTicketPrice] = useState('');
  const [formTicketHours, setFormTicketHours] = useState('');
  const [formTicketDays, setFormTicketDays] = useState('');
  const [formTicketIsStudent, setFormTicketIsStudent] = useState(false);

  const [formBusLicense, setFormBusLicense] = useState('');
  const [formBusCapacity, setFormBusCapacity] = useState('60');

  const [formSchedRouteId, setFormSchedRouteId] = useState('');
  const [formSchedBusId, setFormSchedBusId] = useState('');
  const [formSchedDeparture, setFormSchedDeparture] = useState('05:30');
  const [formSchedSpeed, setFormSchedSpeed] = useState('18.5');
  const [formSchedDays, setFormSchedDays] = useState('MON-SUN');

  const [formStaffName, setFormStaffName] = useState('');
  const [formStaffEmail, setFormStaffEmail] = useState('');
  const [formStaffPhone, setFormStaffPhone] = useState('');
  const [formStaffPassword, setFormStaffPassword] = useState('Inspector@123456');

  // Load all data
  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [dashRes, routesRes, ttRes, busesRes, schedRes, ordersRes, staffRes, complaintsRes] = await Promise.all([
        fetch('/api/admin/dashboard').then((r) => r.json()),
        fetch('/api/admin/routes').then((r) => r.json()),
        fetch('/api/admin/ticket-types').then((r) => r.json()),
        fetch('/api/admin/buses').then((r) => r.json()),
        fetch('/api/admin/schedules').then((r) => r.json()),
        fetch('/api/admin/orders').then((r) => r.json()),
        fetch('/api/admin/staff').then((r) => r.json()),
        fetch('/api/admin/complaints').then((r) => r.json()),
      ]);

      setDashboardData(dashRes);
      setRoutes(Array.isArray(routesRes) ? routesRes : []);
      setTicketTypes(Array.isArray(ttRes) ? ttRes : []);
      setBuses(Array.isArray(busesRes) ? busesRes : []);
      setSchedules(Array.isArray(schedRes) ? schedRes : []);
      setOrders(Array.isArray(ordersRes) ? ordersRes : []);
      setStaff(Array.isArray(staffRes) ? staffRes : []);
      setComplaints(Array.isArray(complaintsRes) ? complaintsRes : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setCurrentUser(data.user);
          if (data.user.role === 'admin') {
            fetchAllData();
          }
        }
      })
      .catch(() => {})
      .finally(() => setAuthLoading(false));
  }, []);


  // Filtered lists with pagination
  const filteredRoutes = useMemo(() => {
    const q = routeSearch.toLowerCase().trim();
    if (!q) return routes;
    return routes.filter((r) =>
      `${r.route_code || r.routeCode} ${r.route_name || r.routeName} ${r.enterprise || ''}`.toLowerCase().includes(q)
    );
  }, [routes, routeSearch]);

  const pagedRoutes = useMemo(() => {
    const start = (routesPage - 1) * pageSize;
    return filteredRoutes.slice(start, start + pageSize);
  }, [filteredRoutes, routesPage]);

  const filteredTicketTypes = useMemo(() => {
    const q = ticketSearch.toLowerCase().trim();
    if (!q) return ticketTypes;
    return ticketTypes.filter((t) => `${t.name} ${t.category}`.toLowerCase().includes(q));
  }, [ticketTypes, ticketSearch]);

  const pagedTicketTypes = useMemo(() => {
    const start = (ticketsPage - 1) * pageSize;
    return filteredTicketTypes.slice(start, start + pageSize);
  }, [filteredTicketTypes, ticketsPage]);

  const filteredBuses = useMemo(() => {
    const q = busSearch.toLowerCase().trim();
    if (!q) return buses;
    return buses.filter((b) => b.license_plate.toLowerCase().includes(q));
  }, [buses, busSearch]);

  const pagedBuses = useMemo(() => {
    const start = (busesPage - 1) * pageSize;
    return filteredBuses.slice(start, start + pageSize);
  }, [filteredBuses, busesPage]);

  const filteredSchedules = useMemo(() => {
    if (!scheduleFilterRoute) return schedules;
    return schedules.filter((s) => s.route_id === scheduleFilterRoute || s.routeCode === scheduleFilterRoute);
  }, [schedules, scheduleFilterRoute]);

  const pagedSchedules = useMemo(() => {
    const start = (schedulesPage - 1) * pageSize;
    return filteredSchedules.slice(start, start + pageSize);
  }, [filteredSchedules, schedulesPage]);

  const filteredOrders = useMemo(() => {
    const q = orderSearch.toLowerCase().trim();
    if (!q) return orders;
    return orders.filter((o) =>
      `${o.order_code || o.orderCode} ${o.guest_phone || ''} ${o.status}`.toLowerCase().includes(q)
    );
  }, [orders, orderSearch]);

  const pagedOrders = useMemo(() => {
    const start = (ordersPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, ordersPage]);

  // ===================== CRUD HANDLERS =====================

  // 1. ROUTE CRUD
  const handleOpenCreateRoute = () => {
    setFormRouteCode('');
    setFormRouteName('');
    setFormRouteDirection('FORWARD');
    setFormRouteEnterprise('Xí nghiệp Xe buýt Hà Nội');
    setFormRouteOperatingHours('5h00 - 21h00');
    setFormRoutePrice('10.000đ/lượt');
    setFormRouteInterval('10-15 phút/chuyến');
    setFormRouteDescription('');
    setModalType('CREATE_ROUTE');
  };

  const handleOpenEditRoute = (r: any) => {
    setEditingItem(r);
    setFormRouteCode(r.route_code || r.routeCode || '');
    setFormRouteName(r.route_name || r.routeName || '');
    setFormRouteDirection(r.direction || 'FORWARD');
    setFormRouteEnterprise(r.enterprise || '');
    setFormRouteOperatingHours(r.operating_hours || r.operatingHours || '');
    setFormRoutePrice(r.price || '');
    setFormRouteInterval(r.interval || '');
    setFormRouteDescription(r.description || '');
    setModalType('EDIT_ROUTE');
  };

  const handleSubmitRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modalType === 'CREATE_ROUTE') {
      const res = await fetch('/api/admin/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routeCode: formRouteCode,
          routeName: formRouteName,
          direction: formRouteDirection,
          enterprise: formRouteEnterprise,
          operatingHours: formRouteOperatingHours,
          price: formRoutePrice,
          interval: formRouteInterval,
          description: formRouteDescription,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error?.message || 'Không thể tạo tuyến');
        return;
      }
    } else if (modalType === 'EDIT_ROUTE' && editingItem) {
      const res = await fetch(`/api/admin/routes/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routeName: formRouteName,
          direction: formRouteDirection,
          enterprise: formRouteEnterprise,
          operatingHours: formRouteOperatingHours,
          price: formRoutePrice,
          interval: formRouteInterval,
          description: formRouteDescription,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error?.message || 'Không thể cập nhật tuyến');
        return;
      }
    }
    setModalType(null);
    fetchAllData();
  };

  const handleDeleteRoute = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa tuyến xe buýt này?')) return;
    const res = await fetch(`/api/admin/routes/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const d = await res.json();
      alert(d.error?.message || 'Không thể xóa tuyến');
    }
    fetchAllData();
  };

  // 2. TICKET TYPE CRUD
  const handleOpenCreateTicket = () => {
    setFormTicketCategory('SINGLE_RIDE');
    setFormTicketName('');
    setFormTicketPrice('10000');
    setFormTicketHours('2');
    setFormTicketDays('');
    setFormTicketIsStudent(false);
    setModalType('CREATE_TICKET');
  };

  const handleOpenEditTicket = (tt: any) => {
    setEditingItem(tt);
    setFormTicketCategory(tt.category);
    setFormTicketName(tt.name);
    setFormTicketPrice(tt.price.toString());
    setFormTicketHours(tt.validity_hours?.toString() || '');
    setFormTicketDays(tt.validity_days?.toString() || '');
    setFormTicketIsStudent(Boolean(tt.is_student_price));
    setModalType('EDIT_TICKET');
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modalType === 'CREATE_TICKET') {
      const res = await fetch('/api/admin/ticket-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: formTicketCategory,
          name: formTicketName,
          price: formTicketPrice,
          validityHours: formTicketHours || null,
          validityDays: formTicketDays || null,
          isStudentPrice: formTicketIsStudent,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error?.message || 'Không thể tạo loại vé');
        return;
      }
    } else if (modalType === 'EDIT_TICKET' && editingItem) {
      const res = await fetch(`/api/admin/ticket-types/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formTicketName,
          price: formTicketPrice,
          validityHours: formTicketHours ? parseInt(formTicketHours, 10) : null,
          validityDays: formTicketDays ? parseInt(formTicketDays, 10) : null,
          isStudentPrice: formTicketIsStudent,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error?.message || 'Không thể cập nhật loại vé');
        return;
      }
    }
    setModalType(null);
    fetchAllData();
  };

  const handleDeleteTicket = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa loại vé này?')) return;
    const res = await fetch(`/api/admin/ticket-types/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const d = await res.json();
      alert(d.error?.message || 'Không thể xóa loại vé');
    }
    fetchAllData();
  };

  // 3. BUS CRUD
  const handleOpenCreateBus = () => {
    setFormBusLicense('');
    setFormBusCapacity('60');
    setModalType('CREATE_BUS');
  };

  const handleOpenEditBus = (bus: any) => {
    setEditingItem(bus);
    setFormBusLicense(bus.license_plate);
    setFormBusCapacity(bus.capacity.toString());
    setModalType('EDIT_BUS');
  };

  const handleSubmitBus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modalType === 'CREATE_BUS') {
      const res = await fetch('/api/admin/buses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licensePlate: formBusLicense,
          capacity: formBusCapacity,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error?.message || 'Không thể tạo xe buýt');
        return;
      }
    } else if (modalType === 'EDIT_BUS' && editingItem) {
      const res = await fetch(`/api/admin/buses/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licensePlate: formBusLicense,
          capacity: formBusCapacity,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error?.message || 'Không thể cập nhật xe buýt');
        return;
      }
    }
    setModalType(null);
    fetchAllData();
  };

  const handleDeleteBus = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa xe buýt này?')) return;
    const res = await fetch(`/api/admin/buses/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const d = await res.json();
      alert(d.error?.message || 'Không thể xóa xe buýt');
    }
    fetchAllData();
  };

  // 4. SCHEDULE CRUD
  const handleOpenCreateSchedule = () => {
    setFormSchedRouteId(routes[0]?.id || '');
    setFormSchedBusId('');
    setFormSchedDeparture('05:30');
    setFormSchedSpeed('18.5');
    setFormSchedDays('MON-SUN');
    setModalType('CREATE_SCHEDULE');
  };

  const handleOpenEditSchedule = (s: any) => {
    setEditingItem(s);
    setFormSchedRouteId(s.route_id);
    setFormSchedBusId(s.bus_id || '');
    setFormSchedDeparture(s.departure_time);
    setFormSchedSpeed(s.average_speed_kmh?.toString() || '18.5');
    setFormSchedDays(s.days_of_week || 'MON-SUN');
    setModalType('EDIT_SCHEDULE');
  };

  const handleSubmitSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modalType === 'CREATE_SCHEDULE') {
      const res = await fetch('/api/admin/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routeId: formSchedRouteId,
          busId: formSchedBusId || null,
          departureTime: formSchedDeparture,
          averageSpeedKmh: formSchedSpeed,
          daysOfWeek: formSchedDays,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error?.message || 'Không thể tạo lịch chạy');
        return;
      }
    } else if (modalType === 'EDIT_SCHEDULE' && editingItem) {
      const res = await fetch(`/api/admin/schedules/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          busId: formSchedBusId || null,
          departureTime: formSchedDeparture,
          averageSpeedKmh: formSchedSpeed,
          daysOfWeek: formSchedDays,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        alert(d.error?.message || 'Không thể cập nhật lịch chạy');
        return;
      }
    }
    setModalType(null);
    fetchAllData();
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa lịch chạy này?')) return;
    const res = await fetch(`/api/admin/schedules/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const d = await res.json();
      alert(d.error?.message || 'Không thể xóa lịch chạy');
    }
    fetchAllData();
  };

  // 5. STAFF CRUD
  const handleSubmitStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: formStaffName,
        email: formStaffEmail,
        phone: formStaffPhone,
        password: formStaffPassword,
      }),
    });
    if (!res.ok) {
      const d = await res.json();
      alert(d.error?.message || 'Không thể tạo tài khoản');
      return;
    }
    setModalType(null);
    fetchAllData();
  };

  const handleToggleStaff = async (id: string, current: boolean) => {
    await fetch(`/api/admin/staff/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !current }),
    });
    fetchAllData();
  };

  const handleUpdateComplaint = async (id: string, status: string) => {
    await fetch(`/api/admin/complaints/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    fetchAllData();
  };

  if (authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-slate-500 text-sm animate-pulse">
        Đang xác thực quyền Quản trị viên...
      </div>
    );
  }

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="max-w-md mx-auto px-4 py-16 flex-1 flex flex-col justify-center">
        <div className="bg-white rounded-2xl border border-sky-200 p-8 shadow-sm text-center">
          <div className="w-14 h-14 rounded-2xl bg-sky-100 text-sky-800 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Truy cập Quản trị viên</h2>
          <p className="text-xs text-slate-600 mb-6 leading-relaxed">
            Bạn cần đăng nhập bằng tài khoản <strong>Quản trị viên (Admin)</strong> để truy cập hệ thống quản trị xe buýt Vivu.
          </p>
          <div className="space-y-2">
            <Link
              href="/login"
              className="block w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
            >
              Đăng nhập tài khoản Admin
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

  const navTabs = [
    { id: 'DASHBOARD', label: 'Tổng quan hệ thống', icon: LayoutDashboard, desc: 'Thống kê doanh thu, tỷ lệ đặt vé và trạng thái mạng lưới' },
    { id: 'ROUTES', label: 'Quản lý tuyến xe', icon: Bus, badge: routes.length, desc: 'Danh sách 149 tuyến buýt Hà Nội, thêm mới & chỉnh sửa thông tin' },
    { id: 'TICKETS', label: 'Loại vé & Giá vé', icon: Ticket, badge: ticketTypes.length, desc: 'Cấu hình giá vé lượt, vé liên tuyến, vé ngày và vé tháng' },
    { id: 'BUSES', label: 'Phương tiện / Xe buýt', icon: Bus, badge: buses.length, desc: 'Quản lý danh sách phương tiện, biển số xe và sức chứa' },
    { id: 'SCHEDULES', label: 'Lịch trình xuất bến', icon: Clock, badge: schedules.length, desc: 'Thời gian xuất bến các chuyến và phân bổ phương tiện' },
    { id: 'ORDERS', label: 'Đơn hàng & Thanh toán', icon: Receipt, badge: orders.length, desc: 'Lịch sử giao dịch VietQR, thanh toán và xuất vé điện tử' },
    { id: 'STAFF', label: 'Nhân viên soát vé', icon: Users, badge: staff.length, desc: 'Quản lý tài khoản và cấp quyền nhân viên soát vé' },
    { id: 'COMPLAINTS', label: 'Phản ánh & Khiếu nại', icon: MessageSquare, badge: complaints.length, desc: 'Tiếp nhận và xử lý ý kiến đóng góp từ hành khách' },
  ];

  const currentTabInfo = navTabs.find((t) => t.id === activeTab) || navTabs[0];
  const CurrentIcon = currentTabInfo.icon;

  return (
    <div className="flex-1 flex flex-col md:flex-row min-h-[calc(100vh-4rem)] w-full bg-slate-100">
      {/* Left Vertical Sidebar */}
      <aside className="w-full md:w-64 lg:w-72 bg-slate-900 text-slate-300 border-r border-slate-800 flex flex-col shrink-0">
        {/* Admin Header */}
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-950/40">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="overflow-hidden">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-white tracking-tight">VIVU ADMIN</span>
                <span className="text-[9px] bg-emerald-900 text-emerald-300 px-1.5 py-0.5 rounded font-mono font-bold">PORTAL</span>
              </div>
              <p className="text-xs text-slate-400 truncate">{currentUser.full_name}</p>
            </div>
          </div>
        </div>

        {/* Vertical Navigation Links */}
        <div className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Chức năng Quản trị
          </div>
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-emerald-600 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </div>
                {tab.badge !== undefined && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                      isActive ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-slate-800 space-y-2">
          <button
            onClick={fetchAllData}
            className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            Làm mới dữ liệu
          </button>
          <Link
            href="/"
            className="block w-full py-2 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium text-center transition-colors"
          >
            ← Về Cổng hành khách
          </Link>
        </div>
      </aside>

      {/* Main Workspace (Right) */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        {/* Dynamic Top Bar in Main Content */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2.5">
              <CurrentIcon className="w-6 h-6 text-emerald-600" />
              {currentTabInfo.label}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {currentTabInfo.desc}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-[11px] text-slate-500 font-mono bg-slate-100 px-2.5 py-1 rounded-lg">
              Hệ thống: Hoạt động bình thường
            </span>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-500 text-sm animate-pulse">
            Đang tải dữ liệu quản trị...
          </div>
        ) : (

        <div>
          {/* ================= TAB 1: DASHBOARD ================= */}
          {activeTab === 'DASHBOARD' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-xs text-slate-500 font-semibold block">Doanh thu bán vé</span>
                  <p className="text-2xl font-extrabold text-emerald-700 mt-1">
                    {(dashboardData?.stats?.totalRevenue || 0).toLocaleString('vi-VN')} đ
                  </p>
                  <span className="text-[11px] text-slate-400 mt-1 block">Từ {orders.length} đơn hàng VietQR</span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-xs text-slate-500 font-semibold block">Tuyến xe hoạt động</span>
                  <p className="text-2xl font-extrabold text-slate-900 mt-1">{routes.length} tuyến</p>
                  <span className="text-[11px] text-emerald-600 mt-1 block">100% kết nối dữ liệu xe buýt Thủ đô</span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-xs text-slate-500 font-semibold block">Số lượng xe buýt</span>
                  <p className="text-2xl font-extrabold text-slate-900 mt-1">{buses.length} phương tiện</p>
                  <span className="text-[11px] text-slate-400 mt-1 block">Phục vụ các xí nghiệp vận tải</span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <span className="text-xs text-slate-500 font-semibold block">Nhân viên soát vé</span>
                  <p className="text-2xl font-extrabold text-slate-900 mt-1">{staff.length} tài khoản</p>
                  <span className="text-[11px] text-slate-400 mt-1 block">Ứng dụng quét vé JWT QR</span>
                </div>
              </div>

              {/* Recent Orders Preview */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-emerald-600" />
                    Đơn hàng mới nhất
                  </h3>
                  <button
                    onClick={() => setActiveTab('ORDERS')}
                    className="text-xs text-emerald-700 hover:underline font-semibold"
                  >
                    Xem tất cả đơn →
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                        <th className="pb-2">Mã đơn</th>
                        <th className="pb-2">Tuyến xe</th>
                        <th className="pb-2">Số lượng</th>
                        <th className="pb-2">Tổng tiền</th>
                        <th className="pb-2">Trạng thái</th>
                        <th className="pb-2">Thời gian</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {orders.slice(0, 5).map((o: any) => (
                        <tr key={o.id} className="hover:bg-slate-50">
                          <td className="py-2.5 font-bold text-slate-900">{o.order_code || o.orderCode}</td>
                          <td className="py-2.5">{o.routeName || 'Tuyến xe buýt'}</td>
                          <td className="py-2.5 font-medium">{o.quantity} vé</td>
                          <td className="py-2.5 font-bold text-emerald-700">
                            {(o.total_amount || o.totalAmount || 0).toLocaleString('vi-VN')} đ
                          </td>
                          <td className="py-2.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                o.status === 'PAID'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : o.status === 'PENDING'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {o.status}
                            </span>
                          </td>
                          <td className="py-2.5 text-slate-400">
                            {new Date(o.created_at || Date.now()).toLocaleTimeString('vi-VN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================= TAB 2: ROUTES CRUD ================= */}
          {activeTab === 'ROUTES' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Tìm theo mã tuyến, tên tuyến, xí nghiệp..."
                    value={routeSearch}
                    onChange={(e) => {
                      setRouteSearch(e.target.value);
                      setRoutesPage(1);
                    }}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleOpenCreateRoute}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  Thêm tuyến buýt mới
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                      <th className="pb-2.5">Mã</th>
                      <th className="pb-2.5">Tên tuyến</th>
                      <th className="pb-2.5">Chiều</th>
                      <th className="pb-2.5">Xí nghiệp</th>
                      <th className="pb-2.5">Giá vé</th>
                      <th className="pb-2.5">Giờ hoạt động</th>
                      <th className="pb-2.5 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pagedRoutes.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="py-3">
                          <span className="px-2 py-1 bg-emerald-100 text-emerald-800 font-extrabold rounded-md text-xs">
                            {r.route_code || r.routeCode}
                          </span>
                        </td>
                        <td className="py-3 font-semibold text-slate-900 max-w-xs truncate">
                          {r.route_name || r.routeName}
                        </td>
                        <td className="py-3 text-slate-600">
                          {r.direction === 'FORWARD' ? 'Chiều đi' : 'Chiều về'}
                        </td>
                        <td className="py-3 text-slate-500">{r.enterprise || 'Xe buýt Hà Nội'}</td>
                        <td className="py-3 font-bold text-emerald-700">{r.price || '10.000đ'}</td>
                        <td className="py-3 text-slate-500">{r.operating_hours || r.operatingHours || '5h00 - 21h00'}</td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditRoute(r)}
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700"
                              title="Chỉnh sửa tuyến"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteRoute(r.id)}
                              className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600"
                              title="Xóa tuyến"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <PaginationControls
                currentPage={routesPage}
                totalPages={Math.ceil(filteredRoutes.length / pageSize)}
                totalItems={filteredRoutes.length}
                pageSize={pageSize}
                onPageChange={setRoutesPage}
              />
            </div>
          )}

          {/* ================= TAB 3: TICKETS CRUD ================= */}
          {activeTab === 'TICKETS' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Tìm theo tên loại vé..."
                    value={ticketSearch}
                    onChange={(e) => {
                      setTicketSearch(e.target.value);
                      setTicketsPage(1);
                    }}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleOpenCreateTicket}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  Thêm loại vé mới
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                      <th className="pb-2.5">Danh mục</th>
                      <th className="pb-2.5">Tên loại vé</th>
                      <th className="pb-2.5">Đơn giá</th>
                      <th className="pb-2.5">Thời hạn hiệu lực</th>
                      <th className="pb-2.5">Ưu đãi HSSV</th>
                      <th className="pb-2.5">Trạng thái</th>
                      <th className="pb-2.5 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pagedTicketTypes.map((tt) => (
                      <tr key={tt.id} className="hover:bg-slate-50">
                        <td className="py-3 font-semibold text-slate-700">
                          {tt.category === 'SINGLE_RIDE' && 'Vé lượt'}
                          {tt.category === 'DAILY_PASS' && 'Vé ngày'}
                          {tt.category === 'MONTHLY_PASS' && 'Vé tháng'}
                        </td>
                        <td className="py-3 font-bold text-slate-900">{tt.name}</td>
                        <td className="py-3 font-extrabold text-emerald-700">
                          {tt.price.toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-3 text-slate-600">
                          {tt.validity_hours ? `${tt.validity_hours} giờ` : tt.validity_days ? `${tt.validity_days} ngày` : 'Trong ngày'}
                        </td>
                        <td className="py-3">
                          {tt.is_student_price ? (
                            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-bold text-[10px]">
                              HSSV
                            </span>
                          ) : (
                            <span className="text-slate-400">Không</span>
                          )}
                        </td>
                        <td className="py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              tt.is_active !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {tt.is_active !== false ? 'Áp dụng' : 'Tạm ngưng'}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditTicket(tt)}
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700"
                              title="Sửa loại vé"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteTicket(tt.id)}
                              className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600"
                              title="Xóa loại vé"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <PaginationControls
                currentPage={ticketsPage}
                totalPages={Math.ceil(filteredTicketTypes.length / pageSize)}
                totalItems={filteredTicketTypes.length}
                pageSize={pageSize}
                onPageChange={setTicketsPage}
              />
            </div>
          )}

          {/* ================= TAB 4: BUSES CRUD ================= */}
          {activeTab === 'BUSES' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Tìm theo biển số xe (VD: 29B-123.45)..."
                    value={busSearch}
                    onChange={(e) => {
                      setBusSearch(e.target.value);
                      setBusesPage(1);
                    }}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleOpenCreateBus}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  Thêm xe buýt mới
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                      <th className="pb-2.5">Biển số xe</th>
                      <th className="pb-2.5">Sức chứa hành khách</th>
                      <th className="pb-2.5">Trạng thái vận hành</th>
                      <th className="pb-2.5 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pagedBuses.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50">
                        <td className="py-3 font-extrabold text-slate-900">{b.license_plate}</td>
                        <td className="py-3 font-semibold text-slate-700">{b.capacity} chỗ ngồi/đứng</td>
                        <td className="py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              b.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {b.is_active ? 'Sẵn sàng' : 'Bảo dưỡng'}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditBus(b)}
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700"
                              title="Sửa thông tin xe"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteBus(b.id)}
                              className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600"
                              title="Xóa xe"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <PaginationControls
                currentPage={busesPage}
                totalPages={Math.ceil(filteredBuses.length / pageSize)}
                totalItems={filteredBuses.length}
                pageSize={pageSize}
                onPageChange={setBusesPage}
              />
            </div>
          )}

          {/* ================= TAB 5: SCHEDULES CRUD ================= */}
          {activeTab === 'SCHEDULES' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-600">Lọc theo tuyến:</label>
                  <select
                    value={scheduleFilterRoute}
                    onChange={(e) => {
                      setScheduleFilterRoute(e.target.value);
                      setSchedulesPage(1);
                    }}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  >
                    <option value="">-- Tất cả các tuyến --</option>
                    {routes.map((r) => (
                      <option key={r.id} value={r.id}>
                        Tuyến {r.route_code || r.routeCode} - {r.route_name || r.routeName}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleOpenCreateSchedule}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  Thêm lịch chạy mới
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                      <th className="pb-2.5">Tuyến</th>
                      <th className="pb-2.5">Giờ xuất bến</th>
                      <th className="pb-2.5">Xe phân bổ</th>
                      <th className="pb-2.5">Tốc độ TB</th>
                      <th className="pb-2.5">Ngày áp dụng</th>
                      <th className="pb-2.5 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pagedSchedules.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="py-3 font-bold text-slate-900">
                          Tuyến {s.routeCode || '01'} ({s.routeName || 'Bến xe Gia Lâm - Bến xe Yên Nghĩa'})
                        </td>
                        <td className="py-3 font-extrabold text-emerald-700 text-sm">
                          {s.departure_time}
                        </td>
                        <td className="py-3 text-slate-600">{s.licensePlate || 'Tự động phân bổ'}</td>
                        <td className="py-3 text-slate-500">{s.average_speed_kmh} km/h</td>
                        <td className="py-3 text-slate-500">{s.days_of_week}</td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditSchedule(s)}
                              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700"
                              title="Sửa lịch"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSchedule(s.id)}
                              className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600"
                              title="Xóa lịch"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <PaginationControls
                currentPage={schedulesPage}
                totalPages={Math.ceil(filteredSchedules.length / pageSize)}
                totalItems={filteredSchedules.length}
                pageSize={pageSize}
                onPageChange={setSchedulesPage}
              />
            </div>
          )}

          {/* ================= TAB 6: ORDERS ================= */}
          {activeTab === 'ORDERS' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="relative max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Tìm theo mã đơn hoặc SĐT..."
                  value={orderSearch}
                  onChange={(e) => {
                    setOrderSearch(e.target.value);
                    setOrdersPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                      <th className="pb-2.5">Mã đơn</th>
                      <th className="pb-2.5">SĐT nhận vé</th>
                      <th className="pb-2.5">Số lượng</th>
                      <th className="pb-2.5">Tổng tiền</th>
                      <th className="pb-2.5">Trạng thái</th>
                      <th className="pb-2.5">Ngày kích hoạt</th>
                      <th className="pb-2.5 text-right">Chi tiết</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pagedOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-slate-50">
                        <td className="py-3 font-extrabold text-slate-900">{o.order_code || o.orderCode}</td>
                        <td className="py-3 text-slate-600">{o.guest_phone || 'Khách'}</td>
                        <td className="py-3 font-medium">{o.quantity} vé</td>
                        <td className="py-3 font-bold text-emerald-700">
                          {(o.total_amount || o.totalAmount || 0).toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              o.status === 'PAID'
                                ? 'bg-emerald-100 text-emerald-800'
                                : o.status === 'PENDING'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {o.status}
                          </span>
                        </td>
                        <td className="py-3 text-slate-500">{o.activation_date || o.activationDate}</td>
                        <td className="py-3 text-right">
                          <Link
                            href={`/payment/${o.order_code || o.orderCode}`}
                            target="_blank"
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-semibold text-[11px]"
                          >
                            Xem VietQR
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <PaginationControls
                currentPage={ordersPage}
                totalPages={Math.ceil(filteredOrders.length / pageSize)}
                totalItems={filteredOrders.length}
                pageSize={pageSize}
                onPageChange={setOrdersPage}
              />
            </div>
          )}

          {/* ================= TAB 7: STAFF ================= */}
          {activeTab === 'STAFF' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">Danh sách nhân viên soát vé</h3>
                <button
                  type="button"
                  onClick={() => setModalType('CREATE_STAFF')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Thêm nhân viên soát vé
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                      <th className="pb-2.5">Họ tên</th>
                      <th className="pb-2.5">Email</th>
                      <th className="pb-2.5">Số điện thoại</th>
                      <th className="pb-2.5">Vai trò</th>
                      <th className="pb-2.5">Trạng thái</th>
                      <th className="pb-2.5 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {staff.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="py-3 font-bold text-slate-900">{s.full_name}</td>
                        <td className="py-3 text-slate-600">{s.email}</td>
                        <td className="py-3 text-slate-600">{s.phone}</td>
                        <td className="py-3 font-semibold uppercase text-emerald-700 text-[11px]">{s.role}</td>
                        <td className="py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              s.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {s.is_active ? 'Đang hoạt động' : 'Tạm khóa'}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => handleToggleStaff(s.id, s.is_active)}
                            className="px-2.5 py-1 rounded text-[11px] font-semibold border border-slate-300 hover:bg-slate-100"
                          >
                            {s.is_active ? 'Khóa' : 'Mở khóa'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= TAB 8: COMPLAINTS ================= */}
          {activeTab === 'COMPLAINTS' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Danh sách phản ánh từ hành khách</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                      <th className="pb-2.5">Danh mục</th>
                      <th className="pb-2.5">Nội dung phản ánh</th>
                      <th className="pb-2.5">Trạng thái</th>
                      <th className="pb-2.5">Thời gian</th>
                      <th className="pb-2.5 text-right">Cập nhật</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {complaints.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="py-3 font-bold text-slate-900">{c.category}</td>
                        <td className="py-3 text-slate-700 max-w-sm">{c.content}</td>
                        <td className="py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              c.status === 'RESOLVED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : c.status === 'IN_PROGRESS'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="py-3 text-slate-400">
                          {new Date(c.created_at).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="py-3 text-right">
                          <select
                            value={c.status}
                            onChange={(e) => handleUpdateComplaint(c.id, e.target.value)}
                            className="px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs"
                          >
                            <option value="NEW">NEW</option>
                            <option value="IN_PROGRESS">IN_PROGRESS</option>
                            <option value="RESOLVED">RESOLVED</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
      </main>

      {/* ================= MODAL DIALOGS ================= */}

      {/* ROUTE MODAL (CREATE / EDIT) */}
      {(modalType === 'CREATE_ROUTE' || modalType === 'EDIT_ROUTE') && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Bus className="w-5 h-5 text-emerald-600" />
                {modalType === 'CREATE_ROUTE' ? 'Thêm tuyến xe buýt mới' : 'Chỉnh sửa tuyến xe buýt'}
              </h3>
              <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitRoute} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mã tuyến</label>
                  <input
                    type="text"
                    required
                    placeholder="VD: 01, E01"
                    disabled={modalType === 'EDIT_ROUTE'}
                    value={formRouteCode}
                    onChange={(e) => setFormRouteCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Chiều tuyến</label>
                  <select
                    value={formRouteDirection}
                    onChange={(e) => setFormRouteDirection(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                  >
                    <option value="FORWARD">Chiều đi (FORWARD)</option>
                    <option value="BACKWARD">Chiều về (BACKWARD)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tên tuyến đường</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Bến xe Long Biên - Bến xe Hà Đông"
                  value={formRouteName}
                  onChange={(e) => setFormRouteName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Đơn vị vận hành</label>
                  <input
                    type="text"
                    placeholder="VD: XN Xe buýt Hà Nội"
                    value={formRouteEnterprise}
                    onChange={(e) => setFormRouteEnterprise(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Giá vé niêm yết</label>
                  <input
                    type="text"
                    placeholder="VD: 10000đ/lượt"
                    value={formRoutePrice}
                    onChange={(e) => setFormRoutePrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-emerald-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Giờ hoạt động</label>
                  <input
                    type="text"
                    placeholder="VD: 5h00 - 21h00"
                    value={formRouteOperatingHours}
                    onChange={(e) => setFormRouteOperatingHours(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tần suất chạy xe</label>
                  <input
                    type="text"
                    placeholder="VD: 10-15 phút/chuyến"
                    value={formRouteInterval}
                    onChange={(e) => setFormRouteInterval(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mô tả tóm tắt lộ trình</label>
                <textarea
                  rows={3}
                  value={formRouteDescription}
                  onChange={(e) => setFormRouteDescription(e.target.value)}
                  placeholder="Lộ trình chi tiết các trục đường chính..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-semibold hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs"
                >
                  {modalType === 'CREATE_ROUTE' ? 'Lưu tuyến mới' : 'Cập nhật'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TICKET TYPE MODAL (CREATE / EDIT) */}
      {(modalType === 'CREATE_TICKET' || modalType === 'EDIT_TICKET') && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Ticket className="w-5 h-5 text-emerald-600" />
                {modalType === 'CREATE_TICKET' ? 'Thêm loại vé xe buýt' : 'Chỉnh sửa loại vé'}
              </h3>
              <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitTicket} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Danh mục loại vé</label>
                <select
                  value={formTicketCategory}
                  disabled={modalType === 'EDIT_TICKET'}
                  onChange={(e) => setFormTicketCategory(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                >
                  <option value="SINGLE_RIDE">Vé lượt (SINGLE_RIDE)</option>
                  <option value="DAILY_PASS">Vé ngày (DAILY_PASS)</option>
                  <option value="MONTHLY_PASS">Vé tháng (MONTHLY_PASS)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tên hiển thị loại vé</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Vé ngày toàn mạng lưới"
                  value={formTicketName}
                  onChange={(e) => setFormTicketName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Đơn giá (VNĐ)</label>
                  <input
                    type="number"
                    required
                    min="1000"
                    step="1000"
                    value={formTicketPrice}
                    onChange={(e) => setFormTicketPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-extrabold text-emerald-700"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Thời hạn (Giờ / Ngày)</label>
                  {formTicketCategory === 'MONTHLY_PASS' ? (
                    <input
                      type="number"
                      placeholder="Số ngày (vd: 30)"
                      value={formTicketDays}
                      onChange={(e) => setFormTicketDays(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  ) : (
                    <input
                      type="number"
                      placeholder="Số giờ (vd: 2 hoặc 24)"
                      value={formTicketHours}
                      onChange={(e) => setFormTicketHours(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="studentCheck"
                  checked={formTicketIsStudent}
                  onChange={(e) => setFormTicketIsStudent(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="studentCheck" className="font-semibold text-slate-700 cursor-pointer">
                  Áp dụng giá ưu đãi Học sinh / Sinh viên
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-semibold hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs"
                >
                  {modalType === 'CREATE_TICKET' ? 'Lưu loại vé' : 'Cập nhật'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BUS MODAL (CREATE / EDIT) */}
      {(modalType === 'CREATE_BUS' || modalType === 'EDIT_BUS') && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Bus className="w-5 h-5 text-emerald-600" />
                {modalType === 'CREATE_BUS' ? 'Thêm phương tiện mới' : 'Chỉnh sửa xe buýt'}
              </h3>
              <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitBus} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Biển kiểm soát xe</label>
                <input
                  type="text"
                  required
                  placeholder="VD: 29B-123.45"
                  value={formBusLicense}
                  onChange={(e) => setFormBusLicense(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-extrabold uppercase"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Sức chứa hành khách</label>
                <input
                  type="number"
                  required
                  min="20"
                  max="120"
                  value={formBusCapacity}
                  onChange={(e) => setFormBusCapacity(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-semibold hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs"
                >
                  {modalType === 'CREATE_BUS' ? 'Lưu xe mới' : 'Cập nhật'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SCHEDULE MODAL (CREATE / EDIT) */}
      {(modalType === 'CREATE_SCHEDULE' || modalType === 'EDIT_SCHEDULE') && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Clock className="w-5 h-5 text-emerald-600" />
                {modalType === 'CREATE_SCHEDULE' ? 'Thêm lịch chạy mới' : 'Chỉnh sửa lịch chạy'}
              </h3>
              <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitSchedule} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tuyến xe áp dụng</label>
                <select
                  value={formSchedRouteId}
                  disabled={modalType === 'EDIT_SCHEDULE'}
                  onChange={(e) => setFormSchedRouteId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                >
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      Tuyến {r.route_code || r.routeCode} - {r.route_name || r.routeName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Xe buýt phân bổ (tùy chọn)</label>
                <select
                  value={formSchedBusId}
                  onChange={(e) => setFormSchedBusId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold"
                >
                  <option value="">-- Tự động điều phối --</option>
                  {buses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.license_plate} ({b.capacity} chỗ)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Giờ xuất bến</label>
                  <input
                    type="time"
                    required
                    value={formSchedDeparture}
                    onChange={(e) => setFormSchedDeparture(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-extrabold text-sm"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tốc độ TB (km/h)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={formSchedSpeed}
                    onChange={(e) => setFormSchedSpeed(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Các ngày áp dụng</label>
                <input
                  type="text"
                  placeholder="VD: MON-SUN, MON-FRI"
                  value={formSchedDays}
                  onChange={(e) => setFormSchedDays(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-semibold hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs"
                >
                  {modalType === 'CREATE_SCHEDULE' ? 'Lưu lịch chạy' : 'Cập nhật'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STAFF MODAL (CREATE) */}
      {modalType === 'CREATE_STAFF' && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                Thêm nhân viên soát vé
              </h3>
              <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitStaff} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Họ và tên</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Nguyễn Văn Soát"
                  value={formStaffName}
                  onChange={(e) => setFormStaffName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  placeholder="inspector@busticket.vn"
                  value={formStaffEmail}
                  onChange={(e) => setFormStaffEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Số điện thoại</label>
                <input
                  type="tel"
                  placeholder="0901000002"
                  value={formStaffPhone}
                  onChange={(e) => setFormStaffPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mật khẩu khởi tạo</label>
                <input
                  type="text"
                  value={formStaffPassword}
                  onChange={(e) => setFormStaffPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-semibold hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs"
                >
                  Tạo tài khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
