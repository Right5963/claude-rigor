import { describe, it, expect } from "vitest";
import { extractAssistantText, lastAssistantTexts } from "./transcript";

function line(obj: unknown): string {
  return JSON.stringify(obj);
}

describe("extractAssistantText", () => {
  it("returns '' for invalid JSON", () => {
    expect(extractAssistantText("not json")).toBe("");
  });

  it("returns '' for a non-assistant role", () => {
    expect(extractAssistantText(line({ message: { role: "user", content: "hi" } }))).toBe("");
  });

  it("extracts string content", () => {
    expect(extractAssistantText(line({ message: { role: "assistant", content: "hello" } }))).toBe(
      "hello",
    );
  });

  it("extracts text blocks from array content", () => {
    const entry = {
      message: {
        role: "assistant",
        content: [
          { type: "text", text: "first" },
          { type: "tool_use", id: "x" },
          { type: "text", text: "second" },
        ],
      },
    };
    expect(extractAssistantText(line(entry))).toBe("first second");
  });

  it("ignores non-text blocks", () => {
    const entry = {
      message: { role: "assistant", content: [{ type: "tool_use", id: "x" }] },
    };
    expect(extractAssistantText(line(entry))).toBe("");
  });
});

describe("lastAssistantTexts", () => {
  it("returns [] for empty input", () => {
    expect(lastAssistantTexts("")).toEqual([]);
  });

  it("collects assistant texts in order and skips others", () => {
    const jsonl = [
      line({ message: { role: "user", content: "q1" } }),
      line({ message: { role: "assistant", content: "a1" } }),
      line({ message: { role: "user", content: "q2" } }),
      line({ message: { role: "assistant", content: "a2" } }),
    ].join("\n");
    expect(lastAssistantTexts(jsonl)).toEqual(["a1", "a2"]);
  });

  it("limits to the last `count` messages", () => {
    const jsonl = [
      line({ message: { role: "assistant", content: "a1" } }),
      line({ message: { role: "assistant", content: "a2" } }),
      line({ message: { role: "assistant", content: "a3" } }),
    ].join("\n");
    expect(lastAssistantTexts(jsonl, 2)).toEqual(["a2", "a3"]);
  });

  it("tolerates malformed lines mixed in", () => {
    const jsonl = [
      "garbage",
      line({ message: { role: "assistant", content: "ok" } }),
      "{ broken",
    ].join("\n");
    expect(lastAssistantTexts(jsonl)).toEqual(["ok"]);
  });
});
