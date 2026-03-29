import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import fs from "fs";
import path from "path";

type Params = { params: Promise<{ id: string }> };

// GET /api/videos/:id/download — 렌더링된 비디오 파일 다운로드
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  const video = await prisma.video.findUnique({ where: { id } });
  if (!video || !video.outputPath) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!fs.existsSync(video.outputPath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const buffer = fs.readFileSync(video.outputPath);
  const filename = `${video.title.replace(/[^a-zA-Z0-9가-힣\s]/g, "").trim()}.mp4`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      "Content-Length": buffer.length.toString(),
    },
  });
}
