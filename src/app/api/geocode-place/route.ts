import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const place = request.nextUrl.searchParams.get("q");
  if (!place) {
    return NextResponse.json({ error: "Missing q param" }, { status: 400 });
  }

  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place)}&format=json&limit=1`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "RutaEscapista/1.0",
        "Accept-Language": "es",
      },
    });
    if (!res.ok) return NextResponse.json({ error: "Nominatim error" }, { status: 502 });
    const data = await res.json();
    if (!data.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
  } catch {
    return NextResponse.json({ error: "Geocoding failed" }, { status: 502 });
  }
}
