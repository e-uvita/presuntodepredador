import { test, expect } from "bun:test";
import { parseSrt, cueAtTime } from "../src/lib/srt-parser";

test("subtitles tolerate BOM, CRLF, multiline text and unordered blocks; ignore invalid timing", () => {
  const source =
    "\uFEFF2\r\n00:00:02,000 --> 00:00:03,000\r\nSegunda\r\n\r\n1\r\n00:00:00,500 --> 00:00:02,000\r\nPrimera\r\nlínea\r\n\r\n3\r\ninvalid --> 00:00:04,000\r\nInválida";
  const cues = parseSrt(source);
  expect(cues).toHaveLength(2);
  expect(cueAtTime(cues, 0)).toBeUndefined();
  expect(cueAtTime(cues, 0.5)?.text).toBe("Primera\nlínea");
  expect(cueAtTime(cues, 2)?.text).toBe("Segunda");
  expect(cueAtTime(cues, 3)).toBeUndefined();
});
