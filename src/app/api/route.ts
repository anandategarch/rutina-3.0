import { NextResponse } from "next/server";

// audit B1-Medium: konsisten dengan route /api lainnya — respons selalu dinamis
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ name: "Rutina API", status: "ok" });
}
