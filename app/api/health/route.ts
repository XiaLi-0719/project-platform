import { NextResponse } from "next/server";

/** 用于检查 App Router API 是否正常工作 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "next-app-router",
    time: new Date().toISOString(),
  });
}
