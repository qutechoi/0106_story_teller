"use client";

import { useState } from "react";
import { GENRE_CONFIG, type GenreKey } from "@/lib/constants";

type Track = {
  id: string;
  title: string;
  genre: string;
  durationSec: number;
  bpm: number | null;
  musicalKey: string | null;
  filePath: string;
  fileName: string;
  fileSize: number;
  format: string;
  noVocals: boolean;
  cleanStart: boolean;
  cleanEnd: boolean;
  noAwkwardTransitions: boolean;
  qualityApproved: boolean;
  mood: string | null;
  createdAt: string | Date;
};

export function TrackList({ initialTracks }: { initialTracks: Track[] }) {
  const [tracks, setTracks] = useState(initialTracks);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audio] = useState(() =>
    typeof window !== "undefined" ? new Audio() : null
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function togglePlay(track: Track) {
    if (!audio) return;
    if (playingId === track.id) {
      audio.pause();
      setPlayingId(null);
    } else {
      audio.src = track.filePath;
      audio.play();
      setPlayingId(track.id);
      audio.onended = () => setPlayingId(null);
    }
  }

  async function updateQuality(trackId: string, field: string, value: boolean) {
    await fetch(`/api/tracks/${trackId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, [field]: value } : t))
    );
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  function formatDuration(sec: number) {
    if (sec === 0) return "--:--";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  function qualityScore(track: Track) {
    const checks = [
      track.noVocals,
      track.cleanStart,
      track.cleanEnd,
      track.noAwkwardTransitions,
    ];
    return checks.filter(Boolean).length;
  }

  if (tracks.length === 0) {
    return (
      <div className="text-center py-12 text-[var(--muted)]">
        <p className="text-4xl mb-4">🎵</p>
        <p>No tracks yet. Upload your first track from Suno!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tracks.map((track) => {
        const config = GENRE_CONFIG[track.genre as GenreKey];
        const isExpanded = expandedId === track.id;
        const score = qualityScore(track);

        return (
          <div
            key={track.id}
            className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden"
          >
            {/* Main row */}
            <div className="flex items-center gap-4 p-4">
              <button
                onClick={() => togglePlay(track)}
                className="w-10 h-10 rounded-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white flex items-center justify-center flex-shrink-0 transition-colors"
              >
                {playingId === track.id ? "⏸" : "▶"}
              </button>

              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm truncate">{track.title}</h3>
                <div className="flex items-center gap-3 mt-1 text-xs text-[var(--muted)]">
                  <span>
                    {config?.icon} {config?.label ?? track.genre}
                  </span>
                  {track.bpm && <span>{track.bpm} BPM</span>}
                  {track.musicalKey && <span>Key: {track.musicalKey}</span>}
                  <span>{formatDuration(track.durationSec)}</span>
                  <span>{formatFileSize(track.fileSize)}</span>
                  <span className="uppercase">{track.format}</span>
                </div>
              </div>

              {/* Quality indicator */}
              <div className="flex items-center gap-2">
                <div
                  className={`px-2 py-1 rounded text-xs ${
                    score === 4
                      ? "bg-[var(--success)]/20 text-[var(--success)]"
                      : score >= 2
                      ? "bg-[var(--warning)]/20 text-[var(--warning)]"
                      : "bg-[var(--danger)]/20 text-[var(--danger)]"
                  }`}
                >
                  {score}/4
                </div>
                <button
                  onClick={() =>
                    setExpandedId(isExpanded ? null : track.id)
                  }
                  className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors text-sm"
                >
                  {isExpanded ? "▲" : "▼"}
                </button>
              </div>
            </div>

            {/* Expanded: Quality Checklist */}
            {isExpanded && (
              <div className="px-4 pb-4 border-t border-[var(--border)] pt-3">
                <h4 className="text-xs font-semibold text-[var(--muted)] mb-3">
                  Quality Checklist
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      field: "noVocals",
                      label: "No Vocals",
                      desc: "보컬이 없어야 하는 트랙에서 보컬 없음 확인",
                    },
                    {
                      field: "cleanStart",
                      label: "Clean Start",
                      desc: "첫 5초가 어색하게 끊기지 않음",
                    },
                    {
                      field: "cleanEnd",
                      label: "Clean End",
                      desc: "마지막 5초가 어색하게 끊기지 않음",
                    },
                    {
                      field: "noAwkwardTransitions",
                      label: "Smooth Transitions",
                      desc: "AI 특유의 어색한 전환 없음",
                    },
                  ].map(({ field, label, desc }) => (
                    <label
                      key={field}
                      className="flex items-start gap-2 cursor-pointer p-2 rounded hover:bg-[var(--card-hover)]"
                    >
                      <input
                        type="checkbox"
                        checked={
                          (track as any)[field] as boolean
                        }
                        onChange={(e) =>
                          updateQuality(track.id, field, e.target.checked)
                        }
                        className="mt-0.5 accent-[var(--success)]"
                      />
                      <div>
                        <p className="text-sm font-medium">{label}</p>
                        <p className="text-xs text-[var(--muted)]">{desc}</p>
                      </div>
                    </label>
                  ))}
                </div>

                {score === 4 && !track.qualityApproved && (
                  <button
                    onClick={() =>
                      updateQuality(track.id, "qualityApproved", true)
                    }
                    className="mt-3 w-full py-2 bg-[var(--success)] text-white rounded-lg text-sm hover:opacity-90 transition-opacity"
                  >
                    Approve Track
                  </button>
                )}
                {track.qualityApproved && (
                  <div className="mt-3 text-center text-sm text-[var(--success)]">
                    ✅ Quality Approved
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
