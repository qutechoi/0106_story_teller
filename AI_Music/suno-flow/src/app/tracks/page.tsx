import { prisma } from "@/lib/db";
import Link from "next/link";
import { GENRE_CONFIG, type GenreKey } from "@/lib/constants";
import { TrackList } from "@/components/track/TrackList";

export default async function TracksPage() {
  const tracks = await prisma.track.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Tracks</h1>
          <p className="text-sm text-[var(--muted)]">
            {tracks.length} tracks in library
          </p>
        </div>
        <Link
          href="/tracks/upload"
          className="px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg text-sm transition-colors"
        >
          + Upload Track
        </Link>
      </div>

      <TrackList initialTracks={tracks} />
    </div>
  );
}
