import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const lat = request.nextUrl.searchParams.get("lat");
  const lng = request.nextUrl.searchParams.get("lng");

  if (!lat || !lng) {
    return NextResponse.json({ error: "Missing lat/lng" }, { status: 400 });
  }

  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "RutaEscapista/1.0",
        "Accept-Language": "es",
      },
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Nominatim error" }, { status: 502 });
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Geocoding failed" }, { status: 502 });
  }
}
