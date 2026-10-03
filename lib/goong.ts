/**
 * Goong Map API Client for Vivu Bus Ticketing Platform
 * Provides Autocomplete, Place Details, Geocoding, and Distance calculations.
 */

const GOONG_API_KEY = process.env.GOONG_API_KEY || 'gsHc6BS0n8LlgiliJkLFJzkbmUcYtvghgphVoqHO';

export interface GoongPrediction {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text: string;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Autocomplete place search using Goong REST API
 */
export async function getAutocompleteSuggestions(
  input: string,
  location = '21.0285,105.8542', // Default: Hanoi center
  radius = 50 // km
): Promise<GoongPrediction[]> {
  if (!input || !input.trim()) return [];

  try {
    const url = new URL('https://rsapi.goong.io/Place/AutoComplete');
    url.searchParams.set('api_key', GOONG_API_KEY);
    url.searchParams.set('input', input.trim());
    url.searchParams.set('location', location);
    url.searchParams.set('radius', radius.toString());
    url.searchParams.set('limit', '8');

    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      console.warn(`[Goong API] Autocomplete failed with status ${res.status}`);
      return [];
    }

    const data = await res.json();
    if (!data.predictions || !Array.isArray(data.predictions)) {
      return [];
    }

    return data.predictions.map((p: any) => ({
      place_id: p.place_id,
      description: p.description,
      main_text: p.structured_formatting?.main_text || p.description,
      secondary_text: p.structured_formatting?.secondary_text || '',
    }));
  } catch (err: any) {
    console.error('[Goong Autocomplete Error]:', err.message);
    return [];
  }
}

/**
 * Get place coordinate details using Goong Place Detail API
 */
export async function getPlaceDetail(placeId: string): Promise<{ coordinates: Coordinates; name: string; address: string } | null> {
  if (!placeId) return null;

  try {
    const url = new URL('https://rsapi.goong.io/Place/Detail');
    url.searchParams.set('api_key', GOONG_API_KEY);
    url.searchParams.set('place_id', placeId);

    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      next: { revalidate: 300 },
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (data.result?.geometry?.location) {
      return {
        coordinates: {
          lat: data.result.geometry.location.lat,
          lng: data.result.geometry.location.lng,
        },
        name: data.result.name || '',
        address: data.result.formatted_address || '',
      };
    }
    return null;
  } catch (err: any) {
    console.error('[Goong Place Detail Error]:', err.message);
    return null;
  }
}

/**
 * Geocode text address to coordinates using Goong Geocode API
 */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number; formattedAddress?: string } | null> {
  if (!address) return null;

  try {
    const url = new URL('https://rsapi.goong.io/Geocode');
    url.searchParams.set('api_key', GOONG_API_KEY);
    url.searchParams.set('address', address);

    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      next: { revalidate: 300 },
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (data.results && data.results.length > 0 && data.results[0].geometry?.location) {
      return {
        lat: data.results[0].geometry.location.lat,
        lng: data.results[0].geometry.location.lng,
        formattedAddress: data.results[0].formatted_address || '',
      };
    }
    return null;
  } catch (err: any) {
    console.error('[Goong Geocode Error]:', err.message);
    return null;
  }
}

/**
 * Calculate Haversine distance in meters between two lat/lng coordinates
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}
