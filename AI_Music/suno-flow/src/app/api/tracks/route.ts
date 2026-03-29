import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { spawn } from "child_process";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

export async function GET() {
  const tracks = await prisma.track.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(tracks);
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string;
    const genre = formData.get("genre") as string;
    const bpm = formData.get("bpm") as string;
    const musicalKey = formData.get("musicalKey") as string;
    const mood = formData.get("mood") as string;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Ensure upload directory exists
    await mkdir(UPLOAD_DIR, { recursive: true });

    // Save file — 디스크 파일명 (타임스탬프 + 원본명)
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = path.extname(file.name).toLowerCase();
    const diskFileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const diskPath = path.join(UPLOAD_DIR, diskFileName);
    await writeFile(diskPath, buffer);

    // ffprobe로 실제 오디오 길이 감지
    const durationSec = await getAudioDuration(diskPath);

    const track = await prisma.track.create({
      data: {
        title: title || file.name.replace(ext, ""),
        genre: genre || "CUSTOM",
        durationSec,
        bpm: bpm ? parseInt(bpm) : null,
        musicalKey: musicalKey || null,
        filePath: `/api/tracks/file/${diskFileName}`,
        fileName: diskFileName,
        fileSize: file.size,
        format: ext.replace(".", "") || "mp3",
        mood: mood || null,
      },
    });

    return NextResponse.json(track, { status: 201 });
  } catch (err: any) {
    console.error("Track upload error:", err);
    return NextResponse.json(
      { error: err.message || "Upload failed" },
      { status: 500 }
    );
  }
}

function getAudioDuration(filePath: string): Promise<number> {
  return new Promise((resolve) => {
    const proc = spawn("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      filePath,
    ]);
    let out = "";
    proc.stdout?.on("data", (d: Buffer) => (out += d.toString()));
    proc.on("close", (code: number | null) => {
      if (code === 0 && out.trim()) {
        resolve(Math.ceil(parseFloat(out.trim())));
      } else {
        resolve(0); // fallback if ffprobe fails
      }
    });
    proc.on("error", () => resolve(0));
  });
}
