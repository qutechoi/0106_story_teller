import { NextRequest, NextResponse } from "next/server";
import { generateBackground } from "@/lib/background-generator";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { genre, mood, customPrompt } = body;

    if (!genre) {
      return NextResponse.json(
        { error: "genre is required" },
        { status: 400 }
      );
    }

    const result = await generateBackground({ genre, mood, customPrompt });

    return NextResponse.json({
      filePath: result.filePath,
      fileName: result.fileName,
      prompt: result.prompt,
      previewUrl: `/api/videos/generate-background/${result.fileName}`,
    });
  } catch (err: any) {
    console.error("Background generation error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate background" },
      { status: 500 }
    );
  }
}
