/**
 * Speculation detector.
 *
 * Pure functions that find speculative / unverified language in a block of
 * assistant text. Code spans (inline `...` and fenced ```...```) are stripped
 * before matching so that *discussing* a banned word in documentation or code
 * does not trigger a false positive.
 *
 * The rule list is data, not control flow, so callers (and user config) can
 * replace or extend it.
 */

export interface SpeculationRule {
  /** Pattern to search for. The "g" flag is added automatically if missing. */
  pattern: RegExp;
  /** Human-readable explanation shown to the agent. */
  reason: string;
}

export interface SpeculationMatch {
  /** The exact substring that matched. */
  phrase: string;
  /** The rule's reason. */
  reason: string;
  /** Offset within the code-stripped text. */
  index: number;
}

/** Default rules: common English and Japanese speculative phrasing. */
export const DEFAULT_SPECULATION_RULES: SpeculationRule[] = [
  { pattern: /\bprobably\b/gi, reason: "probably (speculation)" },
  { pattern: /\bshould\s+work\b/gi, reason: "should work (unverified claim)" },
  { pattern: /\bshould\s+be\s+fine\b/gi, reason: "should be fine (unverified claim)" },
  { pattern: /\bshould\s+be\s+good\b/gi, reason: "should be good (unverified claim)" },
  { pattern: /\bmight\s+work\b/gi, reason: "might work (speculation)" },
  { pattern: /\b(?:most\s+likely|presumably)\b/gi, reason: "most likely/presumably (speculation)" },
  // High-signal "claimed done without evidence" phrasing — the actual pain point.
  { pattern: /\b(?:that\s+)?should\s+(?:fix|do)\s+it\b/gi, reason: "should fix it (unverified)" },
  { pattern: /\bthis\s+should\s+now\b/gi, reason: "this should now (unverified)" },
  // NOTE: "I think" / "I believe" / "I assume" are intentionally NOT in the
  // default set — they fire on legitimate proposals ("I think we should refactor")
  // far more often than on real speculation, so they live in the strict preset.
  // Japanese
  { pattern: /たぶん/g, reason: "たぶん (speculation)" },
  { pattern: /(?:^|[^「『])多分[、,]/g, reason: "多分 (speculation)" },
  { pattern: /おそらく/g, reason: "おそらく (speculation)" },
  { pattern: /だと思(?:う|います?)/g, reason: "だと思う (speculation)" },
  { pattern: /かもしれない/g, reason: "かもしれない (speculation)" },
  { pattern: /可能性が高(?:い|そう)/g, reason: "可能性が高い (speculation)" },
  { pattern: /はず(?:です|だ|だよ|でしょう)/g, reason: "はず (speculation)" },
];

/**
 * Stricter preset: the defaults plus first-person hedging ("I think" etc.).
 * These also fire on legitimate proposals, so they are opt-in — pass this list
 * to detectSpeculation() (or set it via config) when you want maximum coverage
 * and can tolerate more false positives.
 */
export const STRICT_SPECULATION_RULES: SpeculationRule[] = [
  ...DEFAULT_SPECULATION_RULES,
  { pattern: /\bI\s+think\b/gi, reason: "I think (speculation)" },
  { pattern: /\bI\s+believe\b/gi, reason: "I believe (speculation)" },
  { pattern: /\bI\s+assume\b/gi, reason: "I assume (speculation)" },
];

/** Remove fenced and inline code spans so their contents are not matched. */
export function stripCodeSpans(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`\n]*`/g, " ");
}

function ensureGlobal(re: RegExp): RegExp {
  return re.flags.includes("g") ? re : new RegExp(re.source, re.flags + "g");
}

/**
 * Find every speculative phrase in `text`.
 * Returns matches sorted by position. Empty input yields an empty list.
 */
export function detectSpeculation(
  text: string,
  rules: SpeculationRule[] = DEFAULT_SPECULATION_RULES,
): SpeculationMatch[] {
  if (!text) return [];
  const haystack = stripCodeSpans(text);
  const matches: SpeculationMatch[] = [];
  for (const rule of rules) {
    const re = ensureGlobal(rule.pattern);
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(haystack)) !== null) {
      matches.push({ phrase: m[0].trim(), reason: rule.reason, index: m.index });
      if (m.index === re.lastIndex) re.lastIndex++; // guard against zero-width matches
    }
  }
  return matches.sort((a, b) => a.index - b.index);
}

/**
 * Compile plain string phrases (from user config) into rules.
 * ASCII phrases are matched on word boundaries; non-ASCII (e.g. Japanese)
 * are matched literally since `\b` is meaningless there.
 */
export function compilePhrases(phrases: string[], caseInsensitive = true): SpeculationRule[] {
  return phrases.map((p) => {
    const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const isAscii = /^[\x00-\x7F]+$/.test(p);
    const source = isAscii ? `\\b${escaped}\\b` : escaped;
    return { pattern: new RegExp(source, caseInsensitive ? "gi" : "g"), reason: `${p} (speculation)` };
  });
}
