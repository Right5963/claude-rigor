import { describe, it, expect } from "vitest";
import { mergeSettings, buildGroups, nodeCommand, type ClaudeSettings } from "./install";

const DIR = "/home/u/.claude/hooks/claude-rigor";

describe("nodeCommand", () => {
  it("wraps in quotes and normalises backslashes", () => {
    expect(nodeCommand("C:\\a\\b.js")).toBe('node "C:/a/b.js"');
  });
});

describe("buildGroups", () => {
  it("targets Write|Edit|MultiEdit for the goal hook", () => {
    expect(buildGroups(DIR).preTool.matcher).toBe("Write|Edit|MultiEdit");
  });

  it("points commands at the right scripts", () => {
    const g = buildGroups(DIR);
    expect(g.preTool.hooks[0].command).toContain("pretool-goal.js");
    expect(g.stop.hooks[0].command).toContain("stop-speculation.js");
  });

  it("strips a trailing slash from the dir", () => {
    const g = buildGroups(DIR + "/");
    expect(g.stop.hooks[0].command).not.toContain("//hooks");
  });
});

describe("mergeSettings", () => {
  it("adds both hooks to empty settings", () => {
    const out = mergeSettings({}, DIR);
    expect(out.hooks?.PreToolUse).toHaveLength(1);
    expect(out.hooks?.Stop).toHaveLength(1);
  });

  it("is idempotent", () => {
    const once = mergeSettings({}, DIR);
    const twice = mergeSettings(once, DIR);
    expect(twice.hooks?.PreToolUse).toHaveLength(1);
    expect(twice.hooks?.Stop).toHaveLength(1);
  });

  it("preserves unrelated existing hooks", () => {
    const existing: ClaudeSettings = {
      hooks: {
        PreToolUse: [{ matcher: "Bash", hooks: [{ type: "command", command: "node other.js" }] }],
      },
    };
    const out = mergeSettings(existing, DIR);
    expect(out.hooks?.PreToolUse).toHaveLength(2);
    expect(out.hooks?.PreToolUse?.[0].matcher).toBe("Bash");
  });

  it("preserves other top-level settings keys", () => {
    const existing: ClaudeSettings = { model: "opus", hooks: {} };
    const out = mergeSettings(existing, DIR);
    expect(out.model).toBe("opus");
  });

  it("does not mutate the input", () => {
    const existing: ClaudeSettings = { hooks: { PreToolUse: [] } };
    const snapshot = JSON.parse(JSON.stringify(existing));
    mergeSettings(existing, DIR);
    expect(existing).toEqual(snapshot);
  });
});
