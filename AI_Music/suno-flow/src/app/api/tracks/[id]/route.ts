import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const track = await prisma.track.findUnique({ where: { id } });
  if (!track) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(track);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const track = await prisma.track.update({
    where: { id },
    data: body,
  });
  return NextResponse.json(track);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const track = await prisma.track.findUnique({ where: { id } });
  if (!track) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // 업로드된 파일 삭제
  if (track.filePath) {
    try { fs.unlinkSync(track.filePath); } catch {}
  }

  await prisma.track.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
