import { describe, it, expect } from "vitest";
import {
  detectSpeculation,
  stripCodeSpans,
  compilePhrases,
  DEFAULT_SPECULATION_RULES,
} from "./speculation";

describe("stripCodeSpans", () => {
  it("removes inline code spans", () => {
    expect(stripCodeSpans("the word `probably` here")).not.toContain("probably");
  });

  it("removes fenced code blocks", () => {
    const text = "before\n```\nprobably should work\n```\nafter";
    const stripped = stripCodeSpans(text);
    expect(stripped).not.toContain("probably");
    expect(stripped).toContain("before");
    expect(stripped).toContain("after");
  });
});

describe("detectSpeculation", () => {
  it("returns empty array for empty input", () => {
    expect(detectSpeculation("")).toEqual([]);
  });

  it("returns empty array for confident, evidence-based text", () => {
    const text = "Ran the test suite: 42 passed, 0 failed. The fix is confirmed.";
    expect(detectSpeculation(text)).toEqual([]);
  });

  it("detects 'probably'", () => {
    const out = detectSpeculation("This probably fixes it.");
    expect(out).toHaveLength(1);
    expect(out[0].phrase.toLowerCase()).toBe("probably");
  });

  it("detects 'should work' case-insensitively", () => {
    const out = detectSpeculation("It Should Work now.");
    expect(out.some((m) => m.reason.includes("should work"))).toBe(true);
  });

  it("does not match 'probably' inside a longer word (word boundary)", () => {
    expect(detectSpeculation("improbablyx is not a word")).toEqual([]);
  });

  it("ignores speculative words inside backticks", () => {
    expect(detectSpeculation("the literal `probably` token")).toEqual([]);
  });

  it("ignores speculative words inside fenced blocks", () => {
    const text = "Done.\n```js\n// should work\nconst x = 1;\n```";
    expect(detectSpeculation(text)).toEqual([]);
  });

  it("detects Japanese speculation 'たぶん'", () => {
    const out = detectSpeculation("たぶん直りました。");
    expect(out.some((m) => m.reason.includes("たぶん"))).toBe(true);
  });

  it("detects Japanese 'だと思う'", () => {
    const out = detectSpeculation("これで大丈夫だと思う。");
    expect(out.some((m) => m.reason.includes("だと思う"))).toBe(true);
  });

  it("returns matches sorted by position", () => {
    const out = detectSpeculation("I think this should work probably.");
    const indices = out.map((m) => m.index);
    const sorted = [...indices].sort((a, b) => a - b);
    expect(indices).toEqual(sorted);
    expect(out.length).toBeGreaterThanOrEqual(2);
  });

  it("finds multiple occurrences of the same phrase", () => {
    const out = detectSpeculation("probably here and probably there");
    expect(out.filter((m) => m.phrase.toLowerCase() === "probably")).toHaveLength(2);
  });
});

describe("compilePhrases", () => {
  it("compiles ASCII phrases with word boundaries", () => {
    const rules = compilePhrases(["maybe"]);
    expect(detectSpeculation("maybe later", rules)).toHaveLength(1);
    expect(detectSpeculation("maybelline", rules)).toHaveLength(0);
  });

  it("compiles non-ASCII phrases literally", () => {
    const rules = compilePhrases(["かもね"]);
    expect(detectSpeculation("そうかもね。", rules)).toHaveLength(1);
  });

  it("is case-insensitive by default for ASCII", () => {
    const rules = compilePhrases(["maybe"]);
    expect(detectSpeculation("MAYBE", rules)).toHaveLength(1);
  });
});

describe("DEFAULT_SPECULATION_RULES", () => {
  it("is a non-empty list of rules", () => {
    expect(DEFAULT_SPECULATION_RULES.length).toBeGreaterThan(0);
    for (const r of DEFAULT_SPECULATION_RULES) {
      expect(r.pattern).toBeInstanceOf(RegExp);
      expect(typeof r.reason).toBe("string");
    }
  });
});
