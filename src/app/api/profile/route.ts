import { NextResponse } from "next/server";
import { db } from "@/lib/rutina/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const profile = await db.profile.findFirst();
    return NextResponse.json({ profile });
  } catch {
    return NextResponse.json({ error: "Gagal memuat profil" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const current = await db.profile.findFirst();
    if (!current) return NextResponse.json({ error: "Profil belum ada" }, { status: 404 });
    const profile = await db.profile.update({
      where: { id: current.id },
      data: {
        name: typeof body.name === "string" && body.name.trim() ? body.name.trim() : current.name,
        identityVoice: typeof body.identityVoice === "string" ? body.identityVoice : current.identityVoice,
        dailyMissionTarget:
          typeof body.dailyMissionTarget === "number" && body.dailyMissionTarget >= 1
            ? Math.round(body.dailyMissionTarget)
            : current.dailyMissionTarget,
      },
    });
    return NextResponse.json({ profile });
  } catch {
    return NextResponse.json({ error: "Gagal memperbarui profil" }, { status: 500 });
  }
}
