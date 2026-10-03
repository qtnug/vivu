import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/data-store';
import { requireAdmin } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const authCheck = requireAdmin(req);
  if (authCheck.errorResponse) return authCheck.errorResponse;
  return NextResponse.json(store.ticket_types);
}

export async function POST(req: NextRequest) {
  try {
    const authCheck = requireAdmin(req);
    if (authCheck.errorResponse) return authCheck.errorResponse;

    const body = await req.json();
    const { category, name, price, validityHours, validityDays, isStudentPrice } = body;

    if (!category || !name || price === undefined) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Danh mục, tên loại vé và giá là bắt buộc' } },
        { status: 400 }
      );
    }

    const newTicketType = {
      id: crypto.randomUUID(),
      category: category as 'SINGLE_RIDE' | 'DAILY_PASS' | 'MONTHLY_PASS',
      name,
      price: parseFloat(price),
      validity_hours: validityHours ? parseInt(validityHours, 10) : null,
      validity_days: validityDays ? parseInt(validityDays, 10) : null,
      is_student_price: Boolean(isStudentPrice),
      is_active: true,
    };

    store.ticket_types.push(newTicketType);
    return NextResponse.json(newTicketType, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: err.message || 'Lỗi hệ thống' } },
      { status: 500 }
    );
  }
}
