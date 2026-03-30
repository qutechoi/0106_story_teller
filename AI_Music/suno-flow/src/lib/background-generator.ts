import { GoogleGenAI } from "@google/genai";
import mime from "mime";
import path from "path";
import fs from "fs";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
const BG_DIR = path.join(UPLOAD_DIR, "backgrounds");

// 장르별 배경 이미지 프롬프트 매핑
const GENRE_BG_PROMPTS: Record<string, string> = {
  SLEEP_HEALING:
    "A serene moonlit night sky with soft clouds and gentle starlight, deep blue and purple gradient, peaceful atmosphere, cinematic quality, no text, no people",
  LOFI_HIPHOP:
    "A cozy rainy window scene with warm interior lighting, coffee shop ambiance, soft neon glow, nostalgic Japanese city night, cinematic quality, no text, no people",
  CINEMATIC_AMBIENT:
    "A vast cosmic nebula with deep space colors, stars and galaxies, epic cinematic atmosphere, dark blue and purple tones, no text, no people",
  MEDITATION_YOGA:
    "A zen garden at sunrise with morning mist, soft golden light, sacred geometry patterns subtly in background, peaceful mountains, cinematic quality, no text, no people",
  NATURE_SOUNDSCAPE:
    "A lush forest with morning light filtering through trees, gentle stream, moss-covered rocks, ethereal fog, cinematic quality, no text, no people",
  CUSTOM:
    "An abstract dark gradient background with subtle geometric patterns, deep colors, modern minimal aesthetic, no text, no people",
};

// 무드별 추가 프롬프트 수식어
const MOOD_MODIFIERS: Record<string, string> = {
  peaceful: ", soft pastel tones, calm atmosphere",
  dreamy: ", dreamlike haze, soft focus, ethereal light",
  ethereal: ", glowing particles, otherworldly atmosphere",
  warm: ", warm golden tones, cozy feeling",
  meditative: ", sacred geometry, soft glow",
  chill: ", cool blue tones, relaxed urban mood",
  cozy: ", warm interior lighting, comfortable atmosphere",
  nostalgic: ", vintage film grain, faded warm tones",
  mellow: ", soft sunset colors, gentle mood",
  focused: ", clean lines, subtle depth",
  epic: ", dramatic lighting, vast scale",
  mysterious: ", dark shadows, atmospheric fog",
  expansive: ", wide panoramic view, endless horizon",
  dramatic: ", high contrast, powerful composition",
  serene: ", still water reflections, tranquil scene",
  spiritual: ", divine light rays, sacred atmosphere",
  grounding: ", earth tones, natural textures",
  flowing: ", smooth organic shapes, gentle movement",
  natural: ", organic textures, untouched wilderness",
  organic: ", natural patterns, living textures",
  tranquil: ", still lake, mirror reflections",
  immersive: ", surround perspective, deep field of view",
};

export type GenerateBackgroundOptions = {
  genre: string;
  mood?: string;
  customPrompt?: string;
};

export type GenerateBackgroundResult = {
  filePath: string;
  fileName: string;
  prompt: string;
};

export async function generateBackground(
  opts: GenerateBackgroundOptions
): Promise<GenerateBackgroundResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Please add it to your .env file."
    );
  }

  // 배경 디렉토리 생성
  if (!fs.existsSync(BG_DIR)) {
    fs.mkdirSync(BG_DIR, { recursive: true });
  }

  // 프롬프트 구성
  let prompt: string;
  if (opts.customPrompt) {
    prompt = opts.customPrompt;
  } else {
    const basePrompt =
      GENRE_BG_PROMPTS[opts.genre] || GENRE_BG_PROMPTS.CUSTOM;
    const moodModifier = opts.mood ? (MOOD_MODIFIERS[opts.mood] || "") : "";
    prompt = basePrompt + moodModifier;
  }

  // 최종 프롬프트: 영상 배경에 적합하도록 지시
  const fullPrompt = `Generate a 16:9 landscape background image for a music video. Style: ${prompt}. The image should be dark enough for white text overlay to be readable. High quality, 1920x1080 resolution feel.`;

  // Gemini API 호출
  const ai = new GoogleGenAI({ apiKey });
  const config = {
    responseModalities: ["IMAGE", "TEXT"],
  };

  const response = await ai.models.generateContentStream({
    model: "gemini-2.5-flash-image",
    config,
    contents: [
      {
        role: "user",
        parts: [{ text: fullPrompt }],
      },
    ],
  });

  // 응답에서 이미지 추출
  let imageBuffer: Buffer | null = null;
  let mimeType = "image/png";

  for await (const chunk of response) {
    if (
      chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData
    ) {
      const inlineData = chunk.candidates[0].content.parts[0].inlineData;
      mimeType = inlineData.mimeType || "image/png";
      imageBuffer = Buffer.from(inlineData.data || "", "base64");
      break;
    }
  }

  if (!imageBuffer) {
    throw new Error("Failed to generate background image from Gemini API");
  }

  // 파일 저장
  const ext = mime.getExtension(mimeType) || "png";
  const fileName = `bg_${Date.now()}.${ext}`;
  const filePath = path.join(BG_DIR, fileName);

  fs.writeFileSync(filePath, imageBuffer);

  return { filePath, fileName, prompt: fullPrompt };
}
