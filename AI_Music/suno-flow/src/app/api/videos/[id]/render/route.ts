import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { renderVideo, getJob } from "@/lib/video-renderer";
import path from "path";

type Params = { params: Promise<{ id: string }> };

// POST /api/videos/:id/render — 렌더링 시작
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;

  // body에서 가사 데이터 (옵션)
  let lyrics: string[] | undefined;
  try {
    const body = await req.json();
    if (body.lyrics && Array.isArray(body.lyrics)) {
      lyrics = body.lyrics.filter((l: string) => l.trim());
    }
  } catch {
    // body 없으면 가사 없이 진행
  }

  const video = await prisma.video.findUnique({
    where: { id },
    include: {
      tracks: { orderBy: { order: "asc" }, include: { track: true } },
    },
  });

  if (!video)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (video.status === "RENDERING") {
    return NextResponse.json(
      { error: "Already rendering" },
      { status: 409 }
    );
  }

  if (video.tracks.length === 0) {
    return NextResponse.json(
      { error: "No tracks in this video" },
      { status: 400 }
    );
  }

  // 오디오 파일 경로 수집
  const audioPaths = video.tracks.map((vt) =>
    path.join(process.cwd(), "uploads", vt.track.fileName)
  );

  const outputPath = path.join(
    process.cwd(),
    "output",
    `${video.id}.mp4`
  );

  // 상태 업데이트
  await prisma.video.update({
    where: { id },
    data: { status: "RENDERING", renderProgress: 0 },
  });

  // 비동기 렌더링 시작 (응답은 즉시 반환)
  renderVideo({
    videoId: video.id,
    audioPaths,
    outputPath,
    visualizerType: video.visualizerType as "spectrum" | "waveform" | "circular",
    backgroundColor: video.backgroundColor,
    disclosureText: video.disclosureText,
    title: video.title,
    lyrics,
    onProgress: async (progress) => {
      try {
        await prisma.video.update({
          where: { id },
          data: { renderProgress: progress },
        });
      } catch {}
    },
  })
    .then(async () => {
      await prisma.video.update({
        where: { id },
        data: {
          status: "RENDERED",
          renderProgress: 100,
          outputPath,
        },
      });
    })
    .catch(async (err) => {
      console.error("Render error:", err);
      await prisma.video.update({
        where: { id },
        data: { status: "DRAFT", renderProgress: 0 },
      });
    });

  return NextResponse.json({ message: "Rendering started", videoId: video.id });
}
