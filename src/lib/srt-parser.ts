export interface SubtitleCue {
  start: number;
  end: number;
  text: string;
}

function timestampToSeconds(timestamp: string) {
  const match = timestamp
    .trim()
    .match(/^(\d{2,}):([0-5]\d):([0-5]\d)[,.](\d{3})$/);
  if (!match) return NaN;
  const [, hours, minutes, seconds, milliseconds] = match;
  return (
    Number(hours) * 3600 +
    Number(minutes) * 60 +
    Number(seconds) +
    Number(milliseconds) / 1000
  );
}

export function parseSrt(source: string): SubtitleCue[] {
  return source
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .trim()
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block.split("\n");
      const timeIndex = lines.findIndex((line) => line.includes("-->"));
      if (timeIndex < 0) return null;

      const timingLine = lines[timeIndex];
      if (!timingLine) return null;
      const [startText, endText] = timingLine
        .split("-->")
        .map((part) => part.trim());
      if (!startText || !endText) return null;

      const start = timestampToSeconds(startText);
      const end = timestampToSeconds(endText.split(/\s+/)[0] ?? endText);
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
        return null;
      return {
        start,
        end,
        text: lines
          .slice(timeIndex + 1)
          .join("\n")
          .trim(),
      };
    })
    .filter((cue): cue is SubtitleCue => Boolean(cue?.text))
    .sort((a, b) => a.start - b.start);
}

export function cueAtTime(cues: SubtitleCue[], time: number) {
  let low = 0;
  let high = cues.length - 1;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const cue = cues[middle];
    if (!cue) return undefined;
    if (time < cue.start) high = middle - 1;
    else if (time >= cue.end) low = middle + 1;
    else return cue;
  }

  return undefined;
}
