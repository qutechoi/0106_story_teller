import { prisma } from "@/lib/db";
import { VideoCreator } from "@/components/video/VideoCreator";

export default async function VideoCreatePage() {
  const tracks = await prisma.track.findMany({
    where: { qualityApproved: true },
    orderBy: { createdAt: "desc" },
  });

  const allTracks = await prisma.track.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Create Video</h1>
      <p className="text-sm text-[var(--muted)] mb-6">
        Select tracks and configure your playlist video.
        {tracks.length === 0 && allTracks.length > 0 && (
          <span className="text-[var(--warning)] ml-2">
            No approved tracks yet — showing all tracks.
          </span>
        )}
      </p>
      <VideoCreator
        availableTracks={tracks.length > 0 ? tracks : allTracks}
      />
    </div>
  );
}
