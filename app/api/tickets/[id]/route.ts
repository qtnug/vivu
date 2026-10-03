import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/data-store';
import QRCode from 'qrcode';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ticket = store.tickets.find((t) => t.id === id || t.ticket_code === id);

    if (!ticket) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Không tìm thấy vé' } },
        { status: 404 }
      );
    }

    // Generate QR Code data URL
    const qrDataUrl = await QRCode.toDataURL(ticket.qr_payload, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 300,
    });

    return NextResponse.json({
      ...ticket,
      qrDataUrl,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: err.message || 'Lỗi hệ thống' } },
      { status: 500 }
    );
  }
}
