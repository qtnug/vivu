import { NextResponse } from 'next/server';
import { store } from '@/lib/data-store';

export async function GET() {
  try {
    const ticketTypes = store.ticket_types.filter((tt) => tt.is_active);
    return NextResponse.json(ticketTypes);
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: err.message || 'Lỗi hệ thống' } },
      { status: 500 }
    );
  }
}
