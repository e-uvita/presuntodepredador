export interface SubtitleCue {
  start: number;
  end: number;
  text: string;
}

function timestampToSeconds(timestamp: string) {
  const normalized = timestamp.trim().replace(',', '.');
  const parts = normalized.split(':').map(Number);
  if (parts.some(Number.isNaN)) return 0;

  const seconds = parts.pop() ?? 0;
  const minutes = parts.pop() ?? 0;
  const hours = parts.pop() ?? 0;
  return hours * 3600 + minutes * 60 + seconds;
}

export function parseSrt(source: string): SubtitleCue[] {
  return source
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .trim()
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block.split('\n');
      const timeIndex = lines.findIndex((line) => line.includes('-->'));
      if (timeIndex < 0) return null;

      const timingLine = lines[timeIndex];
      if (!timingLine) return null;
      const [startText, endText] = timingLine.split('-->').map((part) => part.trim());
      if (!startText || !endText) return null;

      return {
        start: timestampToSeconds(startText),
        end: timestampToSeconds(endText.split(/\s+/)[0] ?? endText),
        text: lines.slice(timeIndex + 1).join('\n').trim(),
      };
    })
    .filter((cue): cue is SubtitleCue => Boolean(cue?.text));
}

export function cueAtTime(cues: SubtitleCue[], time: number) {
  let low = 0;
  let high = cues.length - 1;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const cue = cues[middle];
    if (!cue) return undefined;
    if (time < cue.start) high = middle - 1;
    else if (time > cue.end) low = middle + 1;
    else return cue;
  }

  return undefined;
}
