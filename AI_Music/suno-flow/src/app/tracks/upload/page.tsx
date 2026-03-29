"use client";

import { useState, useRef } from "react";
import { GENRE_CONFIG, type GenreKey } from "@/lib/constants";
import { useRouter } from "next/navigation";

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [genre, setGenre] = useState<GenreKey>("LOFI_HIPHOP");
  const [bpm, setBpm] = useState("");
  const [musicalKey, setMusicalKey] = useState("");
  const [mood, setMood] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files).filter(
      (f) =>
        f.name.endsWith(".mp3") ||
        f.name.endsWith(".wav") ||
        f.name.endsWith(".flac")
    );
    setFiles((prev) => [...prev, ...dropped]);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  }

  const [error, setError] = useState<string | null>(null);

  async function upload() {
    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append("file", files[i]);
        formData.append("title", files[i].name.replace(/\.\w+$/, ""));
        formData.append("genre", genre);
        if (bpm) formData.append("bpm", bpm);
        if (musicalKey) formData.append("musicalKey", musicalKey);
        if (mood) formData.append("mood", mood);

        const res = await fetch("/api/tracks", { method: "POST", body: formData });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || `Upload failed for ${files[i].name}`);
        }
        setProgress(((i + 1) / files.length) * 100);
      }

      router.push("/tracks");
    } catch (err: any) {
      setError(err.message || "Upload failed");
      setUploading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Upload Tracks</h1>

      {/* Drop zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-[var(--border)] rounded-xl p-12 text-center cursor-pointer hover:border-[var(--primary)] transition-colors mb-6"
      >
        <p className="text-4xl mb-3">🎵</p>
        <p className="font-medium">Drop audio files here</p>
        <p className="text-sm text-[var(--muted)] mt-1">
          MP3, WAV, FLAC supported
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".mp3,.wav,.flac"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 mb-6">
          <h2 className="text-sm font-semibold mb-3">
            {files.length} file(s) selected
          </h2>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {files.map((f, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-sm"
              >
                <span className="truncate">{f.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-[var(--muted)]">
                    {(f.size / (1024 * 1024)).toFixed(1)} MB
                  </span>
                  <button
                    onClick={() =>
                      setFiles((prev) => prev.filter((_, j) => j !== i))
                    }
                    className="text-[var(--danger)] hover:opacity-70"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 mb-6 space-y-4">
        <h2 className="text-sm font-semibold">Track Metadata</h2>

        <div>
          <label className="text-xs text-[var(--muted)] block mb-1">
            Genre
          </label>
          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value as GenreKey)}
            className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
          >
            {Object.entries(GENRE_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>
                {cfg.icon} {cfg.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-[var(--muted)] block mb-1">
              BPM
            </label>
            <input
              type="number"
              value={bpm}
              onChange={(e) => setBpm(e.target.value)}
              placeholder="e.g. 85"
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--muted)] block mb-1">
              Key
            </label>
            <input
              type="text"
              value={musicalKey}
              onChange={(e) => setMusicalKey(e.target.value)}
              placeholder="e.g. Am"
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-[var(--muted)] block mb-1">
              Mood
            </label>
            <input
              type="text"
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              placeholder="e.g. chill"
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Upload button */}
      {uploading ? (
        <div>
          <div className="w-full bg-[var(--border)] rounded-full h-2 mb-2">
            <div
              className="bg-[var(--primary)] h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-center text-[var(--muted)]">
            Uploading... {Math.round(progress)}%
          </p>
        </div>
      ) : (
        <button
          onClick={upload}
          disabled={files.length === 0}
          className="w-full py-3 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
        >
          Upload {files.length} Track{files.length !== 1 ? "s" : ""}
        </button>
      )}
    </div>
  );
}
