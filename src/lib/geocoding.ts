export interface CoordsResult {
  lat: number;
  lng: number;
}

/**
 * Extrae coordenadas de una URL de Google Maps.
 * Soporta formatos: /place/@lat,lng  /search/@lat,lng  ?q=lat,lng  &ll=lat,lng
 * Devuelve null si no puede extraer las coordenadas.
 */
export function extractCoordsFromGoogleMapsUrl(url: string): CoordsResult | null {
  if (!url) return null;

  // Formato más común: /@lat,lng,zoom  (place, search, dir)
  const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) {
    return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
  }

  // Formato ?q=lat,lng o &q=lat,lng (solo números, sin texto)
  const qMatch = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (qMatch) {
    return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
  }

  // Formato ll=lat,lng
  const llMatch = url.match(/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (llMatch) {
    return { lat: parseFloat(llMatch[1]), lng: parseFloat(llMatch[2]) };
  }

  return null;
}

export function isGoogleMapsUrl(url: string): boolean {
  return /google\.(com|es|co\.\w+)\/maps|maps\.google\.|goo\.gl\/maps|maps\.app\.goo\.gl/i.test(url);
}

export function isShortGoogleMapsUrl(url: string): boolean {
  return /maps\.app\.goo\.gl/i.test(url);
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { OpenLocationCode } = require("open-location-code") as { OpenLocationCode: new () => {
  isValid(code: string): boolean;
  isFull(code: string): boolean;
  isShort(code: string): boolean;
  decode(code: string): { latitudeCenter: number; longitudeCenter: number };
  recoverNearest(shortCode: string, refLat: number, refLng: number): string;
} };
const olc = new OpenLocationCode();

export function isPlusCode(input: string): boolean {
  const code = input.trim().split(/\s+/)[0];
  return olc.isValid(code) && (olc.isFull(code) || olc.isShort(code));
}

export function isShortPlusCode(input: string): boolean {
  const code = input.trim().split(/\s+/)[0];
  return olc.isValid(code) && olc.isShort(code);
}

export function decodePlusCode(input: string): CoordsResult | null {
  try {
    const result = olc.decode(input.trim());
    return { lat: result.latitudeCenter, lng: result.longitudeCenter };
  } catch {
    return null;
  }
}

export function recoverPlusCode(shortCode: string, refLat: number, refLng: number): CoordsResult | null {
  try {
    const full = olc.recoverNearest(shortCode, refLat, refLng);
    const result = olc.decode(full);
    return { lat: result.latitudeCenter, lng: result.longitudeCenter };
  } catch {
    return null;
  }
}

export function parsePlusCodeInput(input: string): { code: string; place: string | null } {
  const parts = input.trim().split(/\s+/);
  const code = parts[0];
  const place = parts.length > 1 ? parts.slice(1).join(" ") : null;
  return { code, place };
}
