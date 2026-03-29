import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client.js";

const adapter = new PrismaBetterSqlite3({
  url: "file:" + process.cwd() + "/prisma/dev.db",
});
const prisma = new PrismaClient({ adapter } as any);

const promptTemplates = [
  {
    name: "Deep Sleep Piano & Rain",
    genre: "SLEEP_HEALING",
    template: `[Instrumental only, no vocals]
soft ambient piano with gentle rain sounds,
432hz healing frequency, slow reverb, warm analog tape warmth,
deep sleep inducing, 60 BPM, minimal progression,
no drums, no builds, loopable structure`,
    parameters: JSON.stringify({ bpm: 60, key: "C", mood: "peaceful", instruments: ["ambient piano", "rain sounds"] }),
  },
  {
    name: "432Hz Healing Waves",
    genre: "SLEEP_HEALING",
    template: `[Instrumental only, no vocals]
432hz healing frequency tones, deep ambient pads,
slow ocean wave textures, warm sub bass,
theta wave inducing, 50 BPM, no percussion,
loopable, continuous flow, 8 hour sleep music`,
    parameters: JSON.stringify({ bpm: 50, key: "D", mood: "ethereal", instruments: ["ambient pads", "ocean waves", "sub bass"] }),
  },
  {
    name: "Cozy Lo-Fi Study Beats",
    genre: "LOFI_HIPHOP",
    template: `[Instrumental only, no vocals]
[Analog Warmth]
lo-fi hip-hop beats, vinyl crackle, mellow jazz piano chords,
soft boom-bap drums, warm bass, tape saturation,
chill study vibes, 85 BPM, loopable structure`,
    parameters: JSON.stringify({ bpm: 85, key: "Eb", mood: "chill", instruments: ["jazz piano", "vinyl crackle", "boom-bap drums"] }),
  },
  {
    name: "Rainy Night Lo-Fi Jazz",
    genre: "LOFI_HIPHOP",
    template: `[Instrumental only, no vocals]
[Analog Warmth]
late night lo-fi jazz, gentle rain ambience,
soft Rhodes piano, brushed drums, upright bass,
warm tape compression, nostalgic mood, 78 BPM,
coffee shop atmosphere, loopable`,
    parameters: JSON.stringify({ bpm: 78, key: "Dm", mood: "nostalgic", instruments: ["Rhodes piano", "brushed drums", "upright bass", "rain"] }),
  },
  {
    name: "Epic Space Ambient",
    genre: "CINEMATIC_AMBIENT",
    template: `[Instrumental only, no vocals]
cinematic ambient soundscape, evolving textures,
deep reverb, ethereal pads, subtle strings,
epic atmosphere, slow build, 70 BPM,
spacious and immersive, film score quality`,
    parameters: JSON.stringify({ bpm: 70, key: "Am", mood: "epic", instruments: ["ethereal pads", "strings", "deep synths"] }),
  },
  {
    name: "Morning Meditation Bells",
    genre: "MEDITATION_YOGA",
    template: `[Instrumental only, no vocals]
meditation music, tibetan singing bowls,
gentle drone, soft ambient pads, 432hz tuning,
mindfulness inducing, 55 BPM, breathing pace,
no sudden changes, peaceful and flowing`,
    parameters: JSON.stringify({ bpm: 55, key: "C", mood: "serene", instruments: ["singing bowls", "ambient drones", "soft pads"] }),
  },
  {
    name: "Forest Rain Soundscape",
    genre: "NATURE_SOUNDSCAPE",
    template: `[Instrumental only, no vocals]
immersive nature soundscape, forest rain,
gentle stream, distant thunder, birds singing,
subtle ambient undertone, organic textures,
loopable, no musical progression, pure nature`,
    parameters: JSON.stringify({ bpm: 0, mood: "natural", instruments: ["rain", "stream", "thunder", "birds"] }),
  },
];

async function main() {
  console.log("Seeding prompt templates...");

  for (const template of promptTemplates) {
    await prisma.prompt.create({
      data: {
        ...template,
        isTemplate: true,
      },
    });
  }

  console.log(`Seeded ${promptTemplates.length} prompt templates.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
