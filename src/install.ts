/**
 * Settings installation logic.
 *
 * `mergeSettings` is pure: it takes the existing parsed `settings.json` and the
 * directory the hook scripts live in, and returns a NEW settings object with
 * the claude-rigor hooks added. It never removes or overwrites existing hooks,
 * and it is idempotent (re-running does not duplicate entries). All filesystem
 * work lives in cli.ts.
 */

export interface HookCommand {
  type: "command";
  command: string;
}

export interface HookGroup {
  matcher?: string;
  hooks: HookCommand[];
}

export interface ClaudeSettings {
  hooks?: Record<string, HookGroup[]>;
  [key: string]: unknown;
}

const PRETOOL_SCRIPT = "pretool-goal.js";
const STOP_SCRIPT = "stop-speculation.js";

/** Build a `node "..."` command with forward slashes (portable across OSes). */
export function nodeCommand(scriptPath: string): string {
  return `node "${scriptPath.replace(/\\/g, "/")}"`;
}

/** Build the two hook groups for a given install directory. */
export function buildGroups(scriptDir: string): { preTool: HookGroup; stop: HookGroup } {
  const dir = scriptDir.replace(/\\/g, "/").replace(/\/+$/, "");
  return {
    preTool: {
      matcher: "Write|Edit|MultiEdit",
      hooks: [{ type: "command", command: nodeCommand(`${dir}/hooks/${PRETOOL_SCRIPT}`) }],
    },
    stop: {
      hooks: [{ type: "command", command: nodeCommand(`${dir}/hooks/${STOP_SCRIPT}`) }],
    },
  };
}

function hasScript(groups: HookGroup[], scriptName: string): boolean {
  return groups.some((g) => g.hooks?.some((h) => h.command.includes(scriptName)));
}

/**
 * Return a new settings object with claude-rigor hooks merged in.
 * Existing hooks are preserved; re-running is a no-op (idempotent).
 */
export function mergeSettings(existing: ClaudeSettings, scriptDir: string): ClaudeSettings {
  const { preTool, stop } = buildGroups(scriptDir);
  const hooks: Record<string, HookGroup[]> = { ...(existing.hooks ?? {}) };

  const preToolGroups = [...(hooks.PreToolUse ?? [])];
  if (!hasScript(preToolGroups, PRETOOL_SCRIPT)) preToolGroups.push(preTool);

  const stopGroups = [...(hooks.Stop ?? [])];
  if (!hasScript(stopGroups, STOP_SCRIPT)) stopGroups.push(stop);

  return {
    ...existing,
    hooks: { ...hooks, PreToolUse: preToolGroups, Stop: stopGroups },
  };
}
