"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { GENRE_CONFIG, VISUALIZER_TYPES, type GenreKey } from "@/lib/constants";

type Track = {
  id: string;
  title: string;
  genre: string;
  durationSec: number;
  bpm: number | null;
  musicalKey: string | null;
  fileName: string;
  fileSize: number;
  format: string;
  qualityApproved: boolean;
};

const BG_COLORS = [
  { value: "#0a0a0a", label: "Dark Black" },
  { value: "#0f172a", label: "Dark Navy" },
  { value: "#1a0a2e", label: "Dark Purple" },
  { value: "#0a1628", label: "Midnight Blue" },
  { value: "#1a0000", label: "Dark Red" },
  { value: "#0a1a0a", label: "Dark Green" },
];

// 장르별 배경 설명 (UI 표시용)
const GENRE_BG_LABELS: Record<string, string> = {
  SLEEP_HEALING: "Moonlit night sky with soft clouds",
  LOFI_HIPHOP: "Cozy rainy window, coffee shop ambiance",
  CINEMATIC_AMBIENT: "Cosmic nebula, epic deep space",
  MEDITATION_YOGA: "Zen garden at sunrise with mist",
  NATURE_SOUNDSCAPE: "Lush forest with morning light",
  CUSTOM: "Abstract dark gradient with patterns",
};

export function VideoCreator({
  availableTracks,
}: {
  availableTracks: Track[];
}) {
  const router = useRouter();

  // 비디오 설정
  const [title, setTitle] = useState("");
  const [visualizerType, setVisualizerType] = useState("spectrum");
  const [backgroundColor, setBackgroundColor] = useState("#0a0a0a");
  const [disclosureText, setDisclosureText] = useState(
    "Music generated using Suno AI"
  );
  const [lyricsText, setLyricsText] = useState("");

  // AI 배경 이미지
  const [bgMode, setBgMode] = useState<"color" | "ai">("color");
  const [bgImageUrl, setBgImageUrl] = useState<string | null>(null);
  const [bgImagePath, setBgImagePath] = useState<string | null>(null);
  const [bgGenre, setBgGenre] = useState("SLEEP_HEALING");
  const [bgMood, setBgMood] = useState("");
  const [bgCustomPrompt, setBgCustomPrompt] = useState("");
  const [isGeneratingBg, setIsGeneratingBg] = useState(false);
  const [bgError, setBgError] = useState<string | null>(null);

  // 선택된 트랙 (순서 포함)
  const [selectedTracks, setSelectedTracks] = useState<Track[]>([]);

  // 렌더링 상태
  const [isCreating, setIsCreating] = useState(false);
  const [renderVideoId, setRenderVideoId] = useState<string | null>(null);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderStatus, setRenderStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 드래그 상태
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // ── 트랙 선택/해제 ─────────────────────────────
  function toggleTrack(track: Track) {
    setSelectedTracks((prev) => {
      const exists = prev.find((t) => t.id === track.id);
      if (exists) return prev.filter((t) => t.id !== track.id);
      return [...prev, track];
    });
  }

  function selectAll() {
    setSelectedTracks([...availableTracks]);
  }

  function clearAll() {
    setSelectedTracks([]);
  }

  // ── 드래그 앤 드롭 정렬 ──────────────────────
  function handleDragStart(index: number) {
    setDragIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    setDragOverIndex(index);
  }

  function handleDrop(index: number) {
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    setSelectedTracks((prev) => {
      const items = [...prev];
      const [moved] = items.splice(dragIndex, 1);
      items.splice(index, 0, moved);
      return items;
    });
    setDragIndex(null);
    setDragOverIndex(null);
  }

  function moveTrack(from: number, to: number) {
    if (to < 0 || to >= selectedTracks.length) return;
    setSelectedTracks((prev) => {
      const items = [...prev];
      const [moved] = items.splice(from, 1);
      items.splice(to, 0, moved);
      return items;
    });
  }

  // ── 총 길이 계산 ──────────────────────────────
  const totalDuration = selectedTracks.reduce(
    (sum, t) => sum + t.durationSec,
    0
  );

  function formatDuration(sec: number) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  // ── AI 배경 이미지 생성 ──────────────────────
  async function handleGenerateBackground() {
    setIsGeneratingBg(true);
    setBgError(null);

    try {
      const res = await fetch("/api/videos/generate-background", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          genre: bgGenre,
          mood: bgMood || undefined,
          customPrompt: bgCustomPrompt || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate background");
      }

      const data = await res.json();
      setBgImageUrl(data.previewUrl);
      setBgImagePath(data.filePath);
    } catch (err: any) {
      setBgError(err.message);
    } finally {
      setIsGeneratingBg(false);
    }
  }

  // ── 비디오 생성 & 렌더링 ─────────────────────
  async function handleCreate() {
    if (!title.trim()) {
      setError("Please enter a video title");
      return;
    }
    if (selectedTracks.length === 0) {
      setError("Please select at least one track");
      return;
    }

    setError(null);
    setIsCreating(true);

    try {
      // 1) 비디오 레코드 생성
      const res = await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          visualizerType,
          backgroundColor,
          backgroundUrl: bgMode === "ai" ? bgImagePath : undefined,
          disclosureText,
          trackIds: selectedTracks.map((t) => t.id),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create video");
      }

      const video = await res.json();
      setRenderVideoId(video.id);

      // 2) 렌더링 시작 (가사 포함)
      const lyricsLines = lyricsText
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      const renderRes = await fetch(`/api/videos/${video.id}/render`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lyrics: lyricsLines.length > 0 ? lyricsLines : undefined,
        }),
      });

      if (!renderRes.ok) {
        const data = await renderRes.json();
        throw new Error(data.error || "Failed to start rendering");
      }

      setRenderStatus("RENDERING");

      // 3) 진행률 폴링
      const interval = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/videos/${video.id}/status`);
          const statusData = await statusRes.json();

          setRenderProgress(statusData.renderProgress);

          if (statusData.status === "RENDERED") {
            clearInterval(interval);
            setRenderStatus("RENDERED");
            setIsCreating(false);
          } else if (statusData.status === "DRAFT") {
            // Error case — reset to draft
            clearInterval(interval);
            setRenderStatus(null);
            setIsCreating(false);
            setError("Rendering failed. Please try again.");
          }
        } catch {
          clearInterval(interval);
          setIsCreating(false);
          setError("Failed to check render status");
        }
      }, 2000);
    } catch (err: any) {
      setError(err.message);
      setIsCreating(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* ── 좌측: 트랙 선택 ──────────────────── */}
      <div className="lg:col-span-2 space-y-4">
        {/* 사용 가능한 트랙 */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">Available Tracks</h2>
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="text-xs text-[var(--primary)] hover:underline"
              >
                Select All
              </button>
              <button
                onClick={clearAll}
                className="text-xs text-[var(--muted)] hover:underline"
              >
                Clear
              </button>
            </div>
          </div>

          {availableTracks.length === 0 ? (
            <p className="text-sm text-[var(--muted)] py-4 text-center">
              No tracks available. Upload and approve tracks first.
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {availableTracks.map((track) => {
                const isSelected = selectedTracks.some(
                  (t) => t.id === track.id
                );
                const config = GENRE_CONFIG[track.genre as GenreKey];

                return (
                  <label
                    key={track.id}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-[var(--primary)]/10 border border-[var(--primary)]/30"
                        : "hover:bg-[var(--card-hover)]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleTrack(track)}
                      className="accent-[var(--primary)]"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {track.title}
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        {config?.icon} {config?.label ?? track.genre} |{" "}
                        {formatDuration(track.durationSec)} |{" "}
                        {track.format.toUpperCase()}
                      </p>
                    </div>
                    {track.qualityApproved && (
                      <span className="text-xs text-[var(--success)]">
                        Approved
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* 선택된 트랙 (드래그 정렬) */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">
              Playlist Order ({selectedTracks.length} tracks |{" "}
              {formatDuration(totalDuration)})
            </h2>
          </div>

          {selectedTracks.length === 0 ? (
            <p className="text-sm text-[var(--muted)] py-4 text-center">
              Select tracks above to build your playlist
            </p>
          ) : (
            <div className="space-y-1">
              {selectedTracks.map((track, index) => {
                const config = GENRE_CONFIG[track.genre as GenreKey];
                return (
                  <div
                    key={track.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={() => handleDrop(index)}
                    onDragEnd={() => {
                      setDragIndex(null);
                      setDragOverIndex(null);
                    }}
                    className={`flex items-center gap-3 p-2 rounded-lg transition-all cursor-grab active:cursor-grabbing ${
                      dragOverIndex === index
                        ? "bg-[var(--primary)]/20 border border-dashed border-[var(--primary)]"
                        : dragIndex === index
                        ? "opacity-50"
                        : "bg-[var(--background)] hover:bg-[var(--card-hover)]"
                    }`}
                  >
                    <span className="text-xs text-[var(--muted)] w-6 text-center font-mono">
                      {index + 1}
                    </span>
                    <span className="text-sm cursor-grab">&#x2630;</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{track.title}</p>
                      <p className="text-xs text-[var(--muted)]">
                        {config?.icon} {formatDuration(track.durationSec)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveTrack(index, index - 1)}
                        disabled={index === 0}
                        className="p-1 text-xs text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-30"
                      >
                        &#9650;
                      </button>
                      <button
                        onClick={() => moveTrack(index, index + 1)}
                        disabled={index === selectedTracks.length - 1}
                        className="p-1 text-xs text-[var(--muted)] hover:text-[var(--foreground)] disabled:opacity-30"
                      >
                        &#9660;
                      </button>
                      <button
                        onClick={() => toggleTrack(track)}
                        className="p-1 text-xs text-[var(--danger)] hover:text-[var(--danger)]"
                      >
                        &#10005;
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── 우측: 비디오 설정 ─────────────────── */}
      <div className="space-y-4">
        {/* 제목 */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 space-y-4">
          <h2 className="text-sm font-semibold">Video Settings</h2>

          <div>
            <label className="block text-xs text-[var(--muted)] mb-1">
              Video Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Deep Sleep Music — 3 Hours — Gentle Piano"
              className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[var(--primary)]"
            />
          </div>

          {/* 비주얼라이저 타입 */}
          <div>
            <label className="block text-xs text-[var(--muted)] mb-2">
              Visualizer Type
            </label>
            <div className="space-y-2">
              {VISUALIZER_TYPES.map((vt) => (
                <label
                  key={vt.id}
                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                    visualizerType === vt.id
                      ? "bg-[var(--primary)]/10 border border-[var(--primary)]/30"
                      : "hover:bg-[var(--card-hover)]"
                  }`}
                >
                  <input
                    type="radio"
                    name="visualizer"
                    value={vt.id}
                    checked={visualizerType === vt.id}
                    onChange={(e) => setVisualizerType(e.target.value)}
                    className="accent-[var(--primary)]"
                  />
                  <div>
                    <p className="text-sm font-medium">{vt.label}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {vt.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* 배경 모드 선택 */}
          <div>
            <label className="block text-xs text-[var(--muted)] mb-2">
              Background
            </label>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setBgMode("color")}
                className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  bgMode === "color"
                    ? "bg-[var(--primary)] text-white"
                    : "bg-[var(--background)] text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                Solid Color
              </button>
              <button
                onClick={() => setBgMode("ai")}
                className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  bgMode === "ai"
                    ? "bg-[var(--primary)] text-white"
                    : "bg-[var(--background)] text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                AI Generate
              </button>
            </div>

            {bgMode === "color" ? (
              <div className="grid grid-cols-3 gap-2">
                {BG_COLORS.map((bg) => (
                  <button
                    key={bg.value}
                    onClick={() => setBackgroundColor(bg.value)}
                    className={`p-2 rounded-lg border text-center transition-colors ${
                      backgroundColor === bg.value
                        ? "border-[var(--primary)] ring-1 ring-[var(--primary)]"
                        : "border-[var(--border)] hover:border-[var(--muted)]"
                    }`}
                  >
                    <div
                      className="w-full h-6 rounded mb-1"
                      style={{ backgroundColor: bg.value }}
                    />
                    <span className="text-[10px] text-[var(--muted)]">
                      {bg.label}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {/* 장르 선택 */}
                <div>
                  <label className="block text-[10px] text-[var(--muted)] mb-1">
                    Genre Style
                  </label>
                  <select
                    value={bgGenre}
                    onChange={(e) => setBgGenre(e.target.value)}
                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[var(--primary)]"
                  >
                    {Object.entries(GENRE_BG_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>
                        {GENRE_CONFIG[key as GenreKey]?.icon}{" "}
                        {GENRE_CONFIG[key as GenreKey]?.label || key}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-[var(--muted)] mt-1">
                    {GENRE_BG_LABELS[bgGenre]}
                  </p>
                </div>

                {/* 무드 입력 */}
                <div>
                  <label className="block text-[10px] text-[var(--muted)] mb-1">
                    Mood (optional)
                  </label>
                  <input
                    type="text"
                    value={bgMood}
                    onChange={(e) => setBgMood(e.target.value)}
                    placeholder="e.g. peaceful, dreamy, epic"
                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[var(--primary)]"
                  />
                </div>

                {/* 커스텀 프롬프트 */}
                <div>
                  <label className="block text-[10px] text-[var(--muted)] mb-1">
                    Custom Prompt (overrides genre/mood)
                  </label>
                  <textarea
                    value={bgCustomPrompt}
                    onChange={(e) => setBgCustomPrompt(e.target.value)}
                    placeholder="Describe your ideal background..."
                    rows={2}
                    className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[var(--primary)] resize-none"
                  />
                </div>

                {/* 생성 버튼 */}
                <button
                  onClick={handleGenerateBackground}
                  disabled={isGeneratingBg}
                  className="w-full py-2 bg-[var(--primary)]/20 hover:bg-[var(--primary)]/30 disabled:opacity-50 text-[var(--primary)] rounded-lg text-sm font-medium transition-colors"
                >
                  {isGeneratingBg ? "Generating..." : "Generate Background"}
                </button>

                {bgError && (
                  <p className="text-xs text-[var(--danger)]">{bgError}</p>
                )}

                {/* 생성된 배경 미리보기 */}
                {bgImageUrl && (
                  <div className="relative rounded-lg overflow-hidden border border-[var(--border)]">
                    <img
                      src={bgImageUrl}
                      alt="Generated background"
                      className="w-full aspect-video object-cover"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1">
                      <p className="text-[10px] text-white/70">
                        AI Generated Background
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* AI 공개 문구 */}
          <div>
            <label className="block text-xs text-[var(--muted)] mb-1">
              AI Disclosure Text
            </label>
            <input
              type="text"
              value={disclosureText}
              onChange={(e) => setDisclosureText(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[var(--primary)]"
            />
            <p className="text-[10px] text-[var(--warning)] mt-1">
              YouTube 2025.07 policy: AI 생성 콘텐츠 공개 필수
            </p>
          </div>
        </div>

        {/* 가사 입력 */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Lyrics (Optional)</h2>
            {lyricsText.trim() && (
              <span className="text-xs text-[var(--primary)]">
                {lyricsText.split("\n").filter((l) => l.trim()).length} lines
              </span>
            )}
          </div>
          <textarea
            value={lyricsText}
            onChange={(e) => setLyricsText(e.target.value)}
            placeholder={"한 줄에 하나씩 가사를 입력하세요.\n음악의 에너지 변화에 맞춰 자동 타이밍이 생성됩니다.\n\n예:\n별이 지는 밤\n너와 걸었던 그 길\n가장 느린 이별"}
            rows={8}
            className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-sm focus:outline-none focus:border-[var(--primary)] resize-none"
          />
          <p className="text-[10px] text-[var(--muted)]">
            음악의 볼륨/에너지 변화를 분석하여 가사 표시 타이밍을 자동 매칭합니다
          </p>
        </div>

        {/* 미리보기 */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
          <h2 className="text-sm font-semibold mb-3">Preview</h2>
          <div
            className="w-full aspect-video rounded-lg flex flex-col items-center justify-center relative overflow-hidden"
            style={{
              backgroundColor:
                bgMode === "ai" && bgImageUrl ? "#000" : backgroundColor,
            }}
          >
            {/* AI 배경 이미지 */}
            {bgMode === "ai" && bgImageUrl && (
              <img
                src={bgImageUrl}
                alt="Background"
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}

            {/* 제목 */}
            <p className="relative text-white text-sm font-medium text-center px-4 mb-2 drop-shadow-lg">
              {title || "Video Title"}
            </p>

            {/* 비주얼라이저 미리보기 — 왼쪽 하단, 1/5 크기 */}
            <div className="absolute bottom-6 left-3">
              <div className="flex items-end gap-[1px] h-5 w-16">
                {Array.from({ length: 16 }).map((_, i) => {
                  const heights = [68,42,85,30,72,55,90,25,60,78,45,88,35,65,50,82];
                  return (
                    <div
                      key={i}
                      className="w-[3px] rounded-sm"
                      style={{
                        height: `${heights[i]}%`,
                        backgroundColor:
                          i % 2 === 0 ? "white" : "var(--primary)",
                        opacity: 0.7,
                      }}
                    />
                  );
                })}
              </div>
            </div>

            {/* AI 공개 문구 */}
            <p className="absolute bottom-1 text-white/50 text-[8px] left-1/2 -translate-x-1/2">
              {disclosureText}
            </p>
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-xl p-3 text-sm text-[var(--danger)]">
            {error}
          </div>
        )}

        {/* 렌더링 진행률 */}
        {renderStatus === "RENDERING" && (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
            <h2 className="text-sm font-semibold mb-2">Rendering...</h2>
            <div className="w-full bg-[var(--background)] rounded-full h-3">
              <div
                className="bg-[var(--primary)] h-3 rounded-full transition-all duration-500"
                style={{ width: `${renderProgress}%` }}
              />
            </div>
            <p className="text-xs text-[var(--muted)] mt-1 text-center">
              {Math.round(renderProgress)}%
            </p>
          </div>
        )}

        {/* 렌더링 완료 */}
        {renderStatus === "RENDERED" && (
          <div className="bg-[var(--success)]/10 border border-[var(--success)]/30 rounded-xl p-4 text-center">
            <p className="text-[var(--success)] font-medium mb-2">
              Video rendered successfully!
            </p>
            <button
              onClick={() => router.push("/videos")}
              className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm hover:bg-[var(--primary-hover)] transition-colors"
            >
              View Videos
            </button>
          </div>
        )}

        {/* 생성 버튼 */}
        {!renderStatus && (
          <button
            onClick={handleCreate}
            disabled={isCreating || selectedTracks.length === 0}
            className="w-full py-3 bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors"
          >
            {isCreating ? "Creating..." : "Create & Render Video"}
          </button>
        )}
      </div>
    </div>
  );
}
