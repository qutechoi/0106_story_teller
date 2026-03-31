import { spawn } from "child_process";
import path from "path";

export type TimedLyric = {
  text: string;
  startSec: number;
  endSec: number;
};

/**
 * 오디오 파일을 분석하여 가사 타이밍을 자동 생성
 * 1) ffmpeg silencedetect로 무음 구간(프레이즈 경계) 감지
 * 2) ffmpeg ebur128로 비트/에너지 피크 감지
 * 3) 무음 구간 끝 지점(= 새 프레이즈 시작)에 가사 배치
 * 4) 부족 시 에너지 피크 + 균등 분배로 보충
 */
export async function syncLyricsToAudio(
  audioPath: string,
  lyrics: string[],
  totalDurationSec: number
): Promise<TimedLyric[]> {
  if (lyrics.length === 0) return [];

  // 1) 무음 구간 감지 — 프레이즈 사이의 자연스러운 쉼
  const silences = await detectSilences(audioPath);

  // 2) 비트/에너지 피크 감지
  const beats = await detectBeats(audioPath);

  // 3) 가사 타이밍 생성
  const timestamps = buildTimestamps(lyrics.length, silences, beats, totalDurationSec);

  // 4) TimedLyric 생성
  return lyrics.map((text, i) => {
    const startSec = timestamps[i];
    const endSec = i < lyrics.length - 1
      ? timestamps[i + 1] - 0.3
      : Math.min(startSec + 8, totalDurationSec - 0.5);
    return { text, startSec, endSec: Math.max(endSec, startSec + 1.5) };
  });
}

// ─── 무음 구간 감지 ───────────────────────────────────
type SilenceGap = { start: number; end: number };

function detectSilences(audioPath: string): Promise<SilenceGap[]> {
  return new Promise((resolve) => {
    // silencedetect: -30dB 이하가 0.3초 이상이면 무음으로 판단
    const proc = spawn("ffmpeg", [
      "-i", audioPath,
      "-af", "silencedetect=noise=-30dB:d=0.3",
      "-f", "null", "-",
    ], { stdio: ["pipe", "pipe", "pipe"] });

    let stderr = "";
    proc.stderr?.on("data", (d) => (stderr += d.toString()));

    proc.on("close", () => {
      const gaps: SilenceGap[] = [];
      const lines = stderr.split("\n");

      let silenceStart: number | null = null;
      for (const line of lines) {
        const startMatch = line.match(/silence_start:\s*(-?\d+\.?\d*)/);
        if (startMatch) {
          silenceStart = parseFloat(startMatch[1]);
        }
        const endMatch = line.match(/silence_end:\s*(-?\d+\.?\d*)/);
        if (endMatch && silenceStart !== null) {
          const silenceEnd = parseFloat(endMatch[1]);
          gaps.push({ start: silenceStart, end: silenceEnd });
          silenceStart = null;
        }
      }

      resolve(gaps);
    });

    proc.on("error", () => resolve([]));
  });
}

// ─── 비트/에너지 피크 감지 ────────────────────────────
function detectBeats(audioPath: string): Promise<number[]> {
  return new Promise((resolve) => {
    // ebur128로 0.1초 단위 라우드니스 측정
    const proc = spawn("ffmpeg", [
      "-i", audioPath,
      "-af", "ebur128=metadata=1:peak=true,ametadata=mode=print:key=lavfi.r128.M",
      "-f", "null", "-",
    ], { stdio: ["pipe", "pipe", "pipe"] });

    let stderr = "";
    proc.stderr?.on("data", (d) => (stderr += d.toString()));

    proc.on("close", () => {
      const points: { time: number; loudness: number }[] = [];
      const lines = stderr.split("\n");

      let currentTime = 0;
      for (const line of lines) {
        const timeMatch = line.match(/pts_time[=:](\d+\.?\d*)/);
        if (timeMatch) {
          currentTime = parseFloat(timeMatch[1]);
        }
        const loudMatch = line.match(/lavfi\.r128\.M=(-?\d+\.?\d*)/);
        if (loudMatch) {
          const loudness = parseFloat(loudMatch[1]);
          if (isFinite(loudness) && loudness > -70) {
            points.push({ time: currentTime, loudness });
          }
        }
      }

      if (points.length < 5) {
        resolve([]);
        return;
      }

      // 에너지 피크 감지: 주변보다 4 LUFS 이상 높은 지점
      const peaks: number[] = [];
      const windowSize = 5;
      for (let i = windowSize; i < points.length - windowSize; i++) {
        let localAvg = 0;
        for (let j = i - windowSize; j < i; j++) {
          localAvg += points[j].loudness;
        }
        localAvg /= windowSize;

        if (points[i].loudness - localAvg > 4) {
          const lastPeak = peaks[peaks.length - 1];
          // 최소 1.5초 간격
          if (!lastPeak || points[i].time - lastPeak > 1.5) {
            peaks.push(points[i].time);
          }
        }
      }

      resolve(peaks);
    });

    proc.on("error", () => resolve([]));
  });
}

// ─── 타임스탬프 생성 ─────────────────────────────────
function buildTimestamps(
  lyricCount: number,
  silences: SilenceGap[],
  beats: number[],
  totalDuration: number
): number[] {
  // 무음 구간의 끝 지점 = 새 프레이즈 시작점
  // 첫 2초 이내의 무음은 인트로 전 무음이므로 건너뜀
  const phraseStarts = silences
    .filter(s => s.end > 2 && s.end < totalDuration - 1)
    .map(s => Math.round(s.end * 10) / 10);

  // 사용 가능한 모든 후보 지점 (무음 끝 + 에너지 피크)
  const allCandidates = [...phraseStarts];

  // 비트 피크 중 무음 끝과 1초 이상 떨어진 것만 추가 (중복 방지)
  for (const beat of beats) {
    if (beat > 2 && beat < totalDuration - 1) {
      const tooClose = phraseStarts.some(p => Math.abs(p - beat) < 1.0);
      if (!tooClose) {
        allCandidates.push(beat);
      }
    }
  }

  allCandidates.sort((a, b) => a - b);

  // 후보가 충분한 경우: 가사 수에 맞게 균등 선택
  if (allCandidates.length >= lyricCount) {
    return selectEvenly(allCandidates, lyricCount);
  }

  // 후보가 부족한 경우: 있는 것 사용 + 빈 구간에 균등 분배로 보충
  if (allCandidates.length > 0) {
    return fillGaps(allCandidates, lyricCount, totalDuration);
  }

  // 후보가 전혀 없는 경우: 완전 균등 분배
  const margin = Math.min(totalDuration * 0.05, 3);
  const usable = totalDuration - margin * 2;
  const interval = usable / lyricCount;
  return Array.from({ length: lyricCount }, (_, i) =>
    Math.round((margin + i * interval) * 10) / 10
  );
}

// 배열에서 N개를 균등하게 선택
function selectEvenly(arr: number[], n: number): number[] {
  if (n >= arr.length) return arr.slice(0, n);
  const step = arr.length / n;
  return Array.from({ length: n }, (_, i) => arr[Math.floor(i * step)]);
}

// 후보 지점 사용 + 가장 긴 빈 구간 중간에 삽입하여 보충
function fillGaps(
  existing: number[],
  total: number,
  duration: number
): number[] {
  const result = [...existing];
  result.sort((a, b) => a - b);

  while (result.length < total) {
    // 각 구간의 길이 계산
    const gaps: { start: number; end: number; length: number }[] = [];

    // 처음 ~ 첫 포인트
    if (result[0] > 3) {
      gaps.push({ start: 2, end: result[0], length: result[0] - 2 });
    }
    // 포인트 사이
    for (let i = 0; i < result.length - 1; i++) {
      gaps.push({
        start: result[i],
        end: result[i + 1],
        length: result[i + 1] - result[i],
      });
    }
    // 마지막 포인트 ~ 끝
    const last = result[result.length - 1];
    if (duration - last > 3) {
      gaps.push({ start: last, end: duration - 1, length: duration - 1 - last });
    }

    if (gaps.length === 0) break;

    // 가장 긴 간격의 중간에 삽입
    gaps.sort((a, b) => b.length - a.length);
    const longest = gaps[0];
    if (longest.length < 2) break; // 더 이상 쪼갤 수 없음

    const mid = Math.round(((longest.start + longest.end) / 2) * 10) / 10;
    result.push(mid);
    result.sort((a, b) => a - b);
  }

  return result.slice(0, total);
}
