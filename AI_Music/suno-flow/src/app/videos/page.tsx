import { prisma } from "@/lib/db";
import Link from "next/link";
import { VideoList } from "@/components/video/VideoList";

export default async function VideosPage() {
  const videos = await prisma.video.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      tracks: {
        orderBy: { order: "asc" },
        include: { track: true },
      },
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Videos</h1>
          <p className="text-sm text-[var(--muted)]">
            {videos.length} videos
          </p>
        </div>
        <Link
          href="/videos/create"
          className="px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-lg text-sm transition-colors"
        >
          + Create Video
        </Link>
      </div>

      <VideoList initialVideos={videos} />
    </div>
  );
}
