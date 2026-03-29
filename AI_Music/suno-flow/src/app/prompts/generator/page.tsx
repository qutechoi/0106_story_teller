"use client";

import { useState, useEffect, Suspense } from "react";
import { GENRE_CONFIG, type GenreKey } from "@/lib/constants";
import { useSearchParams } from "next/navigation";

const genres = Object.entries(GENRE_CONFIG).filter(
  ([key]) => key !== "CUSTOM"
) as [GenreKey, (typeof GENRE_CONFIG)[GenreKey]][];

export default function PromptGeneratorPage() {
  return (
    <Suspense fallback={<div className="text-[var(--muted)]">Loading...</div>}>
      <PromptGeneratorContent />
    </Suspense>
  );
}

function PromptGeneratorContent() {
  const searchParams = useSearchParams();
  const fromId = searchParams.get("from");

  const [genre, setGenre] = useState<GenreKey>("SLEEP_HEALING");
  const [bpm, setBpm] = useState(60);
  const [musicalKey, setMusicalKey] = useState("C");
  const [mood, setMood] = useState("");
  const [instruments, setInstruments] = useState<string[]>([]);
  const [customText, setCustomText] = useState("");
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [copied, setCopied] = useState(false);
  const [promptName, setPromptName] = useState("");
  const [saving, setSaving] = useState(false);

  const config = GENRE_CONFIG[genre];

  // Load template if fromId provided
  useEffect(() => {
    if (fromId) {
      fetch(`/api/prompts/${fromId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.genre) setGenre(data.genre as GenreKey);
          setGeneratedPrompt(data.template || "");
          setPromptName(data.name + " (copy)");
          try {
            const params = JSON.parse(data.parameters || "{}");
            if (params.bpm) setBpm(params.bpm);
            if (params.key) setMusicalKey(params.key);
            if (params.mood) setMood(params.mood);
            if (params.instruments) setInstruments(params.instruments);
          } catch {}
        })
        .catch(() => {});
    }
  }, [fromId]);

  // Auto-generate prompt when parameters change
  useEffect(() => {
    if (fromId && generatedPrompt) return; // Don't override loaded template
    generatePrompt();
  }, [genre, bpm, musicalKey, mood, instruments, customText]);

  function generatePrompt() {
    const parts: string[] = ["[Instrumental only, no vocals]"];

    if (genre === "LOFI_HIPHOP") {
      parts.push("[Analog Warmth]");
    }

    const moodStr = mood || config.moodOptions[0] || "";
    const instrStr =
      instruments.length > 0
        ? instruments.join(", ")
        : (config.instrumentOptions?.slice(0, 3).join(", ") ?? "");

    parts.push(`${moodStr} ${config.label.toLowerCase()} music,`);
    if (instrStr) parts.push(`${instrStr},`);

    if (bpm > 0) {
      parts.push(`${bpm} BPM,`);
    }
    if (musicalKey) {
      parts.push(`key of ${musicalKey},`);
    }

    if (genre === "SLEEP_HEALING" || genre === "MEDITATION_YOGA") {
      parts.push("432hz healing frequency, slow reverb,");
    }

    parts.push("loopable structure, no sudden changes");

    if (customText.trim()) {
      parts.push(customText.trim());
    }

    setGeneratedPrompt(parts.join("\n"));
  }

  async function copyToClipboard() {
    await navigator.clipboard.writeText(generatedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function savePrompt() {
    if (!promptName.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/prompts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: promptName,
          genre,
          template: generatedPrompt,
          parameters: JSON.stringify({ bpm, key: musicalKey, mood, instruments }),
        }),
      });
      setSaving(false);
      alert("Prompt saved!");
    } catch {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold mb-6">Prompt Generator</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Controls */}
        <div className="space-y-6">
          {/* Genre Selection */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
            <h2 className="text-sm font-semibold mb-3">Genre</h2>
            <div className="grid grid-cols-2 gap-2">
              {genres.map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => {
                    setGenre(key);
                    setBpm(cfg.defaultBpm);
                    setMood(cfg.moodOptions[0] || "");
                    setInstruments([]);
                  }}
                  className={`p-3 rounded-lg text-left text-sm border transition-colors ${
                    genre === key
                      ? "border-[var(--primary)] bg-[var(--primary)]/10"
                      : "border-[var(--border)] hover:border-[var(--muted)]"
                  }`}
                >
                  <span className="text-lg">{cfg.icon}</span>
                  <p className="font-medium mt-1">{cfg.label}</p>
                  <p className="text-xs text-[var(--muted)]">
                    RPM {cfg.rpm} | {cfg.difficulty}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* BPM */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
            <h2 className="text-sm font-semibold mb-3">BPM: {bpm}</h2>
            <input
              type="range"
              min={config.bpmRange[0]}
              max={config.bpmRange[1]}
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
              className="w-full accent-[var(--primary)]"
            />
            <div className="flex justify-between text-xs text-[var(--muted)] mt-1">
              <span>{config.bpmRange[0]}</span>
              <span>{config.bpmRange[1]}</span>
            </div>
          </div>

          {/* Musical Key */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
            <h2 className="text-sm font-semibold mb-3">Musical Key</h2>
            <div className="flex flex-wrap gap-2">
              {["C", "D", "E", "F", "G", "A", "B", "Am", "Dm", "Em", "Fm", "Gm"].map(
                (k) => (
                  <button
                    key={k}
                    onClick={() => setMusicalKey(k)}
                    className={`px-3 py-1.5 rounded text-sm border transition-colors ${
                      musicalKey === k
                        ? "border-[var(--primary)] bg-[var(--primary)]/10"
                        : "border-[var(--border)] hover:border-[var(--muted)]"
                    }`}
                  >
                    {k}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Mood */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
            <h2 className="text-sm font-semibold mb-3">Mood</h2>
            <div className="flex flex-wrap gap-2">
              {config.moodOptions.map((m) => (
                <button
                  key={m}
                  onClick={() => setMood(m)}
                  className={`px-3 py-1.5 rounded text-sm border transition-colors ${
                    mood === m
                      ? "border-[var(--primary)] bg-[var(--primary)]/10"
                      : "border-[var(--border)] hover:border-[var(--muted)]"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Instruments */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
            <h2 className="text-sm font-semibold mb-3">Instruments</h2>
            <div className="flex flex-wrap gap-2">
              {config.instrumentOptions.map((inst) => (
                <button
                  key={inst}
                  onClick={() =>
                    setInstruments((prev) =>
                      prev.includes(inst)
                        ? prev.filter((i) => i !== inst)
                        : [...prev, inst]
                    )
                  }
                  className={`px-3 py-1.5 rounded text-sm border transition-colors ${
                    instruments.includes(inst)
                      ? "border-[var(--accent)] bg-[var(--accent)]/10"
                      : "border-[var(--border)] hover:border-[var(--muted)]"
                  }`}
                >
                  {inst}
                </button>
              ))}
            </div>
          </div>

          {/* Custom additions */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
            <h2 className="text-sm font-semibold mb-3">Custom Additions</h2>
            <textarea
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Add custom instructions..."
              rows={3}
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg p-3 text-sm resize-none focus:outline-none focus:border-[var(--primary)]"
            />
          </div>
        </div>

        {/* Right: Generated Prompt */}
        <div className="space-y-4">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 sticky top-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">Generated Prompt</h2>
              <div className="flex gap-2">
                <button
                  onClick={generatePrompt}
                  className="px-3 py-1.5 text-xs border border-[var(--border)] rounded hover:bg-[var(--card-hover)] transition-colors"
                >
                  Regenerate
                </button>
                <button
                  onClick={copyToClipboard}
                  className={`px-3 py-1.5 text-xs rounded transition-colors ${
                    copied
                      ? "bg-[var(--success)] text-white"
                      : "bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white"
                  }`}
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            <textarea
              value={generatedPrompt}
              onChange={(e) => setGeneratedPrompt(e.target.value)}
              rows={12}
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg p-3 text-sm font-mono resize-none focus:outline-none focus:border-[var(--primary)]"
            />

            <div className="mt-4 pt-4 border-t border-[var(--border)]">
              <h3 className="text-sm font-semibold mb-2">Save Prompt</h3>
              <input
                type="text"
                value={promptName}
                onChange={(e) => setPromptName(e.target.value)}
                placeholder="Prompt name..."
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:border-[var(--primary)]"
              />
              <button
                onClick={savePrompt}
                disabled={!promptName.trim() || saving}
                className="w-full px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent)]/80 text-white rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save to Library"}
              </button>
            </div>
          </div>

          {/* Usage tips */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4">
            <h2 className="text-sm font-semibold mb-2">Tips</h2>
            <ul className="text-xs text-[var(--muted)] space-y-1.5">
              <li>
                1. Copy the prompt and paste it into Suno&apos;s Custom mode
              </li>
              <li>
                2. Set &quot;Style&quot; in Suno to match the genre
              </li>
              <li>
                3. Generate 2-3 versions and pick the best one
              </li>
              <li>
                4. Download as WAV for Spotify, MP3 for YouTube
              </li>
              <li>
                5. Upload the track to SunoFlow Track Manager
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
