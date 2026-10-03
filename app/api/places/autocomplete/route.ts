import { NextRequest, NextResponse } from 'next/server';
import { getAutocompleteSuggestions } from '@/lib/goong';
import { store } from '@/lib/data-store';

import hanoiStops from '@/lib/hanoi-stops.json';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const input = searchParams.get('input') || '';
    const location = searchParams.get('location') || '21.0285,105.8542';

    if (!input.trim()) {
      return NextResponse.json({ predictions: [] });
    }

    // 1. Fetch from Goong Map API
    const goongResults = await getAutocompleteSuggestions(input, location);

    // 2. Search comprehensive 5,531 Hanoi bus stops
    const q = input.toLowerCase().trim();
    const matchingStops = (hanoiStops as string[])
      .filter((s) => s.toLowerCase().includes(q))
      .slice(0, 4)
      .map((s, idx) => ({
        place_id: `stop_${idx}_${encodeURIComponent(s.trim())}`,
        description: `${s.trim()} (Điểm dừng xe buýt Hà Nội)`,
        main_text: s.trim(),
        secondary_text: 'Điểm dừng xe buýt Hà Nội',
        is_bus_stop: true,
      }));

    // Merge predictions
    const predictions = [...matchingStops, ...goongResults];

    return NextResponse.json({ predictions });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, predictions: [] }, { status: 500 });
  }
}
