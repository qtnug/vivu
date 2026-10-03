/**
 * Vivu Bus Platform - Authoritative Database Domain Models
 * Schema Target: Microsoft SQL Server 2025 Express (bus_ticketing_system)
 * 
 * Strict snake_case column alignment matching scripts/schema.sql and thiet-ke-he-thong-xe-buyt.md
 */

// ============================================================================
// 1. DOMAIN ENUMS & UNION TYPES
// ============================================================================

export type UserRole = 'passenger' | 'inspector' | 'admin';

export type RouteDirection = 'FORWARD' | 'BACKWARD';

export type TicketCategory = 'SINGLE_RIDE' | 'DAILY_PASS' | 'MONTHLY_PASS';

export type OrderStatus = 'PENDING' | 'PAID' | 'CANCELLED' | 'EXPIRED';

export type TicketStatus = 'ACTIVE' | 'USED' | 'EXPIRED' | 'CANCELLED';

export type ComplaintStatus = 'NEW' | 'IN_PROGRESS' | 'RESOLVED';

// ============================================================================
// 2. AUTHORITATIVE TABLE ENTITY MODELS (11 Base Tables)
// ============================================================================

/**
 * 1. users: Account profiles for passengers, inspectors, and administrators
 */
export interface User {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  password_hash: string | null;
  role: UserRole;
  is_student: boolean;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * 2. bus_routes: Bus transit routes with fixed directions
 */
export interface BusRoute {
  id: string;
  route_code: string;
  route_name: string;
  direction: RouteDirection;
  description: string | null;
  is_active: boolean;
  created_at: Date;
}

/**
 * 3. bus_stops: Geographic bus stop locations with coordinates
 */
export interface BusStop {
  id: string;
  stop_name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  created_at: Date;
}

/**
 * 4. route_stops: Sequential station itinerary for a route
 */
export interface RouteStop {
  id: string;
  route_id: string;
  stop_id: string;
  stop_sequence: number;
  distance_from_start_km: number;
}

/**
 * 5. buses: Physical vehicle fleet
 */
export interface Bus {
  id: string;
  license_plate: string;
  capacity: number;
  is_active: boolean;
  created_at: Date;
}

/**
 * 6. schedules: Static departure timetables
 */
export interface Schedule {
  id: string;
  route_id: string;
  bus_id: string | null;
  departure_time: string | Date;
  average_speed_kmh: number;
  days_of_week: string;
  created_at: Date;
}

/**
 * 7. ticket_types: Product catalog and pricing matrix
 */
export interface TicketType {
  id: string;
  category: TicketCategory;
  name: string;
  price: number;
  validity_hours: number | null;
  validity_days: number | null;
  is_student_price: boolean;
  is_active: boolean;
}

/**
 * 8. orders: Passenger ticket orders with VietQR payment state
 */
export interface Order {
  id: string;
  order_code: string;
  user_id: string | null;
  guest_phone: string | null;
  ticket_type_id: string;
  route_id: string;
  quantity: number;
  total_amount: number;
  status: OrderStatus;
  activation_date: Date | string;
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * 9. tickets: Individual electronic tickets with cryptographic QR payloads
 */
export interface Ticket {
  id: string;
  order_id: string;
  route_id: string;
  ticket_code: string;
  qr_payload: string;
  status: TicketStatus;
  valid_from: Date;
  valid_until: Date;
  used_at: Date | null;
  used_by_inspector_id: string | null;
  created_at: Date;
}

/**
 * 10. payment_transactions: SePay webhook reconciliation audit log
 */
export interface PaymentTransaction {
  id: string;
  order_id: string | null;
  sepay_reference_code: string | null;
  transfer_amount: number;
  raw_content: string | null;
  raw_payload: string | null;
  processed_at: Date;
}

/**
 * 11. complaints: Passenger feedback and inquiries
 */
export interface Complaint {
  id: string;
  user_id: string | null;
  route_id: string | null;
  category: string;
  content: string;
  status: ComplaintStatus;
  created_at: Date;
}

// ============================================================================
// 3. SCHEMA MAPPING & INSERTION HELPERS
// ============================================================================

export interface DatabaseSchema {
  users: User;
  bus_routes: BusRoute;
  bus_stops: BusStop;
  route_stops: RouteStop;
  buses: Bus;
  schedules: Schedule;
  ticket_types: TicketType;
  orders: Order;
  tickets: Ticket;
  payment_transactions: PaymentTransaction;
  complaints: Complaint;
}

export type NewUser = Omit<User, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: Date;
  updated_at?: Date;
};

export type NewBusRoute = Omit<BusRoute, 'id' | 'created_at'> & {
  id?: string;
  created_at?: Date;
};

export type NewBusStop = Omit<BusStop, 'id' | 'created_at'> & {
  id?: string;
  created_at?: Date;
};

export type NewRouteStop = Omit<RouteStop, 'id'> & {
  id?: string;
};

export type NewBus = Omit<Bus, 'id' | 'created_at'> & {
  id?: string;
  created_at?: Date;
};

export type NewSchedule = Omit<Schedule, 'id' | 'created_at'> & {
  id?: string;
  created_at?: Date;
};

export type NewTicketType = Omit<TicketType, 'id'> & {
  id?: string;
};

export type NewOrder = Omit<Order, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: Date;
  updated_at?: Date;
};

export type NewTicket = Omit<Ticket, 'id' | 'created_at' | 'used_at' | 'used_by_inspector_id'> & {
  id?: string;
  used_at?: Date | null;
  used_by_inspector_id?: string | null;
  created_at?: Date;
};

export type NewPaymentTransaction = Omit<PaymentTransaction, 'id' | 'processed_at'> & {
  id?: string;
  processed_at?: Date;
};

export type NewComplaint = Omit<Complaint, 'id' | 'created_at'> & {
  id?: string;
  created_at?: Date;
};

// ============================================================================
// 4. INTEGRATION & DTO PAYLOAD CONTRACTS
// ============================================================================

export interface RouteWithStops extends BusRoute {
  stops: (RouteStop & {
    stop_name: string;
    address: string | null;
    latitude: number;
    longitude: number;
  })[];
}

export interface OrderWithTickets extends Order {
  tickets: Ticket[];
  ticket_type: TicketType;
  route: BusRoute;
}

export interface TicketJwtPayload {
  ticket_id: string;
  ticket_code: string;
  order_code: string;
  route_id: string;
  route_code: string;
  valid_from: string;
  valid_until: string;
  is_student: boolean;
  status: TicketStatus;
}

export interface TicketVerificationResult {
  valid: boolean;
  reason?: string;
  ticket?: Ticket & {
    route_name?: string;
    route_code?: string;
    category?: TicketCategory;
  };
}

export interface SePayWebhookInbound {
  gateway: string;
  transactionDate: string;
  accountNumber: string;
  code: string | null;
  content: string;
  transferType: string;
  transferAmount: number;
  referenceCode: string;
}
