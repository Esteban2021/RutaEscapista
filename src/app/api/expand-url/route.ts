import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url param" }, { status: 400 });
  }

  try {
    const res = await fetch(url, { redirect: "follow" });
    return NextResponse.json({ expanded: res.url });
  } catch {
    return NextResponse.json({ error: "No se pudo expandir la URL" }, { status: 502 });
  }
}
