import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import fs from "fs";

type Params = { params: Promise<{ id: string }> };

// GET /api/videos/:id
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const video = await prisma.video.findUnique({
    where: { id },
    include: {
      tracks: { orderBy: { order: "asc" }, include: { track: true } },
    },
  });
  if (!video)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(video);
}

// PATCH /api/videos/:id
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();

  const video = await prisma.video.update({
    where: { id },
    data: body,
    include: {
      tracks: { orderBy: { order: "asc" }, include: { track: true } },
    },
  });
  return NextResponse.json(video);
}

// DELETE /api/videos/:id
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  const video = await prisma.video.findUnique({ where: { id } });
  if (!video)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  // 렌더링된 파일 삭제
  if (video.outputPath && fs.existsSync(video.outputPath)) {
    fs.unlinkSync(video.outputPath);
  }

  await prisma.video.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
