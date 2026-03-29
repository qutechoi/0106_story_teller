"use client";

import { useState } from "react";
import Link from "next/link";

type VideoWithTracks = {
  id: string;
  title: string;
  status: string;
  renderProgress: number;
  visualizerType: string;
  durationSec: number | null;
  outputPath: string | null;
  createdAt: string | Date;
  tracks: {
    order: number;
    track: { title: string; durationSec: number; genre: string };
  }[];
};

const statusConfig: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Draft", color: "var(--muted)" },
  RENDERING: { label: "Rendering...", color: "var(--warning)" },
  RENDERED: { label: "Rendered", color: "var(--success)" },
  UPLOADED: { label: "Uploaded", color: "var(--primary)" },
  PUBLISHED: { label: "Published", color: "var(--accent)" },
};

export function VideoList({
  initialVideos,
}: {
  initialVideos: VideoWithTracks[];
}) {
  const [videos, setVideos] = useState(initialVideos);

  function formatDuration(sec: number) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  function totalDuration(video: VideoWithTracks) {
    return video.tracks.reduce((sum, vt) => sum + vt.track.durationSec, 0);
  }

  async function deleteVideo(id: string) {
    if (!confirm("Delete this video?")) return;
    await fetch(`/api/videos/${id}`, { method: "DELETE" });
    setVideos((prev) => prev.filter((v) => v.id !== id));
  }

  if (videos.length === 0) {
    return (
      <div className="text-center py-12 text-[var(--muted)]">
        <p className="text-4xl mb-4">🎬</p>
        <p>No videos yet. Create your first playlist video!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {videos.map((video) => {
        const st = statusConfig[video.status] ?? statusConfig.DRAFT;
        const dur = totalDuration(video);

        return (
          <div
            key={video.id}
            className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4"
          >
            <div className="flex items-center gap-4">
              {/* 미리보기 영역 */}
              <div className="w-32 h-18 bg-[var(--background)] rounded-lg flex items-center justify-center text-2xl flex-shrink-0">
                🎬
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm truncate">{video.title}</h3>
                <div className="flex items-center gap-3 mt-1 text-xs text-[var(--muted)]">
                  <span>{video.tracks.length} tracks</span>
                  <span>{formatDuration(dur)}</span>
                  <span
                    className="font-medium"
                    style={{ color: st.color }}
                  >
                    {st.label}
                  </span>
                </div>

                {/* 렌더링 진행률 */}
                {video.status === "RENDERING" && (
                  <div className="mt-2 w-full bg-[var(--background)] rounded-full h-2">
                    <div
                      className="bg-[var(--primary)] h-2 rounded-full transition-all"
                      style={{ width: `${video.renderProgress}%` }}
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {video.status === "RENDERED" && video.outputPath && (
                  <a
                    href={`/api/videos/${video.id}/download`}
                    className="px-3 py-1.5 text-xs bg-[var(--success)] text-white rounded-lg hover:opacity-90"
                  >
                    Download
                  </a>
                )}
                <button
                  onClick={() => deleteVideo(video.id)}
                  className="px-3 py-1.5 text-xs text-[var(--danger)] border border-[var(--danger)] rounded-lg hover:bg-[var(--danger)] hover:text-white transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>

            {/* 트랙 리스트 */}
            {video.tracks.length > 0 && (
              <div className="mt-3 pt-3 border-t border-[var(--border)]">
                <div className="flex flex-wrap gap-2">
                  {video.tracks.map((vt, i) => (
                    <span
                      key={i}
                      className="text-xs bg-[var(--background)] px-2 py-1 rounded"
                    >
                      {i + 1}. {vt.track.title} ({formatDuration(vt.track.durationSec)})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
