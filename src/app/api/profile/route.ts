import { NextResponse } from "next/server";
import { db } from "@/lib/rutina/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Pastikan profil default selalu ada — GET tidak boleh mengembalikan null.
    const profile = await db.profile.upsert({
      where: { id: "main" },
      update: {},
      create: { id: "main" },
    });
    return NextResponse.json({ profile });
  } catch (e) {
    console.error("profile GET error", e);
    return NextResponse.json({ error: "Gagal memuat profil" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Body JSON tidak valid" }, { status: 400 });
    }

    const current = await db.profile.findFirst();
    if (!current) return NextResponse.json({ error: "Profil belum ada" }, { status: 404 });

    const data: { name?: string; identityVoice?: string; dailyMissionTarget?: number } = {};

    if (body.name !== undefined) {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name || name.length > 60) {
        return NextResponse.json(
          { error: "Nama wajib diisi (maksimal 60 karakter)" },
          { status: 400 }
        );
      }
      data.name = name;
    }
    if (body.identityVoice !== undefined && typeof body.identityVoice === "string") {
      data.identityVoice = body.identityVoice;
    }
    if (body.dailyMissionTarget !== undefined) {
      const target = Number(body.dailyMissionTarget);
      if (!Number.isInteger(target) || target < 1 || target > 20) {
        return NextResponse.json(
          { error: "Target misi harian harus angka bulat 1-20" },
          { status: 400 }
        );
      }
      data.dailyMissionTarget = target;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Tidak ada data untuk diperbarui" }, { status: 400 });
    }

    const profile = await db.profile.update({ where: { id: current.id }, data });
    return NextResponse.json({ profile });
  } catch (e) {
    console.error("profile PATCH error", e);
    return NextResponse.json({ error: "Gagal memperbarui profil" }, { status: 500 });
  }
}
