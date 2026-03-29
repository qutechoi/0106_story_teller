import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

// GET /api/videos/:id/status — 렌더링 진행률 조회
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  const video = await prisma.video.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      renderProgress: true,
      outputPath: true,
    },
  });

  if (!video)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(video);
}
