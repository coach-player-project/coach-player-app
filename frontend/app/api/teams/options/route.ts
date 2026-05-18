import { NextResponse } from "next/server";
import { buildBackendApiUrl, getServerBackendUrl } from "@/lib/backend-url";

export async function GET() {
  const res = await fetch(buildBackendApiUrl(getServerBackendUrl(), "/teams/options"), {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  const text = await res.text();

  return new NextResponse(text, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "application/json",
    },
  });
}
