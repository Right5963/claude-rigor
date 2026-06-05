import { describe, it, expect } from "vitest";
import { mergeConfig, DEFAULT_CONFIG } from "./config";

describe("mergeConfig", () => {
  it("returns the base when override is not an object", () => {
    expect(mergeConfig(DEFAULT_CONFIG, null)).toEqual(DEFAULT_CONFIG);
    expect(mergeConfig(DEFAULT_CONFIG, "nope")).toEqual(DEFAULT_CONFIG);
    expect(mergeConfig(DEFAULT_CONFIG, 42)).toEqual(DEFAULT_CONFIG);
  });

  it("overrides enabled flags", () => {
    const out = mergeConfig(DEFAULT_CONFIG, { speculation: { enabled: false } });
    expect(out.speculation.enabled).toBe(false);
    expect(out.goal.enabled).toBe(true);
  });

  it("keeps defaults for invalid field types", () => {
    const out = mergeConfig(DEFAULT_CONFIG, {
      speculation: { enabled: "yes", lookbackMessages: -3 },
    });
    expect(out.speculation.enabled).toBe(true); // "yes" rejected
    expect(out.speculation.lookbackMessages).toBe(DEFAULT_CONFIG.speculation.lookbackMessages);
  });

  it("accepts a custom phrase list", () => {
    const out = mergeConfig(DEFAULT_CONFIG, { speculation: { phrases: ["maybe", "perhaps"] } });
    expect(out.speculation.phrases).toEqual(["maybe", "perhaps"]);
  });

  it("filters non-string entries from phrase lists", () => {
    const out = mergeConfig(DEFAULT_CONFIG, { speculation: { phrases: ["ok", 1, null, "fine"] } });
    expect(out.speculation.phrases).toEqual(["ok", "fine"]);
  });

  it("ignores an empty phrase array and keeps the default", () => {
    const out = mergeConfig(DEFAULT_CONFIG, { speculation: { phrases: [] } });
    expect(out.speculation.phrases).toBe(DEFAULT_CONFIG.speculation.phrases);
  });

  it("accepts custom goal markers and lookback", () => {
    const out = mergeConfig(DEFAULT_CONFIG, { goal: { markers: ["INTENT:"], lookbackMessages: 10 } });
    expect(out.goal.markers).toEqual(["INTENT:"]);
    expect(out.goal.lookbackMessages).toBe(10);
  });

  it("does not mutate the base config", () => {
    const snapshot = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    mergeConfig(DEFAULT_CONFIG, { speculation: { enabled: false, phrases: ["x"] } });
    expect(DEFAULT_CONFIG).toEqual(snapshot);
  });
});
