/**
 * User configuration.
 *
 * Optional file `<.claude>/claude-rigor.json`. Missing or malformed config
 * falls back to defaults, so the tool works zero-config. `mergeConfig` is pure
 * and validates each field defensively (untrusted JSON in -> typed config out).
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export interface SpeculationConfig {
  enabled: boolean;
  /** Custom phrase list; when undefined the built-in default rules are used. */
  phrases?: string[];
  /** How many trailing assistant messages to scan. */
  lookbackMessages: number;
}

export interface GoalConfig {
  enabled: boolean;
  /** Custom goal markers; when undefined the built-in defaults are used. */
  markers?: string[];
  /** How many trailing assistant messages to scan. */
  lookbackMessages: number;
}

export interface RigorConfig {
  speculation: SpeculationConfig;
  goal: GoalConfig;
}

export const DEFAULT_CONFIG: RigorConfig = {
  speculation: { enabled: true, lookbackMessages: 5 },
  goal: { enabled: true, lookbackMessages: 20 },
};

interface PartialSection {
  enabled?: unknown;
  phrases?: unknown;
  markers?: unknown;
  lookbackMessages?: unknown;
}

interface PartialConfig {
  speculation?: PartialSection;
  goal?: PartialSection;
}

function pickBool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function pickNum(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

function pickStrArr(value: unknown, fallback: string[] | undefined): string[] | undefined {
  if (!Array.isArray(value)) return fallback;
  const cleaned = value.filter((v): v is string => typeof v === "string");
  return cleaned.length > 0 ? cleaned : fallback;
}

/** Merge untrusted override data onto a base config. Pure. */
export function mergeConfig(base: RigorConfig, override: unknown): RigorConfig {
  if (!override || typeof override !== "object") return base;
  const o = override as PartialConfig;
  return {
    speculation: {
      enabled: pickBool(o.speculation?.enabled, base.speculation.enabled),
      phrases: pickStrArr(o.speculation?.phrases, base.speculation.phrases),
      lookbackMessages: pickNum(o.speculation?.lookbackMessages, base.speculation.lookbackMessages),
    },
    goal: {
      enabled: pickBool(o.goal?.enabled, base.goal.enabled),
      markers: pickStrArr(o.goal?.markers, base.goal.markers),
      lookbackMessages: pickNum(o.goal?.lookbackMessages, base.goal.lookbackMessages),
    },
  };
}

/** Load config from `<claudeDir>/claude-rigor.json`, falling back to defaults. */
export function loadConfig(claudeDir: string): RigorConfig {
  try {
    const path = join(claudeDir, "claude-rigor.json");
    if (!existsSync(path)) return DEFAULT_CONFIG;
    const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
    return mergeConfig(DEFAULT_CONFIG, parsed);
  } catch {
    return DEFAULT_CONFIG;
  }
}
