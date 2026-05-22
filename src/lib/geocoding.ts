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
