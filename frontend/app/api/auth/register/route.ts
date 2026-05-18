import { NextRequest, NextResponse } from "next/server";
import { buildBackendApiUrl, getServerBackendUrl } from "@/lib/backend-url";

export async function POST(request: NextRequest) {
  const body = await request.text();

  const res = await fetch(buildBackendApiUrl(getServerBackendUrl(), "/auth/register"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body,
  });

  const text = await res.text();

  return new NextResponse(text, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "application/json",
    },
  });
}
