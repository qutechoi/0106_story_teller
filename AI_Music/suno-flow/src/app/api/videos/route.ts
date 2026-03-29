import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/videos — 전체 비디오 목록
export async function GET() {
  const videos = await prisma.video.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      tracks: {
        orderBy: { order: "asc" },
        include: { track: true },
      },
    },
  });
  return NextResponse.json(videos);
}

// POST /api/videos — 새 비디오 생성
export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    title,
    description,
    visualizerType = "spectrum",
    backgroundColor = "#0a0a0a",
    disclosureText = "Music generated using Suno AI",
    trackIds = [] as string[],
  } = body;

  if (!title || trackIds.length === 0) {
    return NextResponse.json(
      { error: "Title and at least one track are required" },
      { status: 400 }
    );
  }

  const video = await prisma.video.create({
    data: {
      title,
      description,
      visualizerType,
      backgroundColor,
      disclosureText,
      tracks: {
        create: trackIds.map((trackId: string, index: number) => ({
          trackId,
          order: index,
          startSec: 0,
        })),
      },
    },
    include: {
      tracks: {
        orderBy: { order: "asc" },
        include: { track: true },
      },
    },
  });

  return NextResponse.json(video, { status: 201 });
}
