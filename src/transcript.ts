/**
 * Claude Code transcript parsing.
 *
 * A transcript is a JSONL file: one JSON object per line. Assistant turns have
 * the shape `{ message: { role: "assistant", content: ... } }` where `content`
 * is either a string or an array of blocks; text blocks are `{ type: "text",
 * text: string }`. Anything that does not parse is skipped.
 *
 * `extractAssistantText` and `lastAssistantTexts` are pure (testable);
 * `readTranscript` is the only I/O boundary.
 */
import { readFileSync } from "node:fs";

interface TranscriptEntry {
  message?: {
    role?: string;
    content?: unknown;
  };
}

function blockToText(block: unknown): string {
  if (typeof block === "string") return block;
  if (block && typeof block === "object") {
    const b = block as { type?: string; text?: string };
    if (b.type === "text" && typeof b.text === "string") return b.text;
  }
  return "";
}

/** Extract the assistant text from a single JSONL line, or "" if not applicable. */
export function extractAssistantText(line: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch {
    return "";
  }
  const entry = parsed as TranscriptEntry;
  if (entry?.message?.role !== "assistant") return "";
  const content = entry.message.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map(blockToText).filter(Boolean).join(" ");
  }
  return "";
}

/** Return the text of the last `count` assistant messages from JSONL content. */
export function lastAssistantTexts(jsonl: string, count = 5): string[] {
  if (!jsonl) return [];
  const lines = jsonl.trim().split(/\r?\n/);
  const texts: string[] = [];
  for (const line of lines) {
    const t = extractAssistantText(line);
    if (t) texts.push(t);
  }
  return texts.slice(-count);
}

/** Read a transcript file from disk (I/O boundary). */
export function readTranscript(path: string): string {
  return readFileSync(path, "utf8");
}
