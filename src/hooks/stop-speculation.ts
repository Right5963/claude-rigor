#!/usr/bin/env node
/**
 * Stop hook: blocks the agent from ending its turn while its recent output
 * contains speculative / unverified language. Exits 2 with guidance so the
 * agent continues and replaces the claim with evidence.
 *
 * Fails open: any error or missing transcript exits 0 (never blocks on a bug).
 */
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { readStdin } from "../stdin";
import { readTranscript, lastAssistantTexts } from "../transcript";
import {
  detectSpeculation,
  compilePhrases,
  DEFAULT_SPECULATION_RULES,
} from "../detectors/speculation";
import { loadConfig } from "../config";

async function main(): Promise<void> {
  const raw = await readStdin();
  let input: unknown;
  try {
    input = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  const transcriptPath = (input as { transcript_path?: string }).transcript_path;
  if (!transcriptPath || !existsSync(transcriptPath)) process.exit(0);

  const claudeDir = resolve(__dirname, "..", "..", "..");
  const cfg = loadConfig(claudeDir);
  if (!cfg.speculation.enabled) process.exit(0);

  const rules = cfg.speculation.phrases
    ? compilePhrases(cfg.speculation.phrases)
    : DEFAULT_SPECULATION_RULES;

  const combined = lastAssistantTexts(
    readTranscript(transcriptPath),
    cfg.speculation.lookbackMessages,
  ).join("\n");
  if (!combined) process.exit(0);

  const matches = detectSpeculation(combined, rules);
  if (matches.length === 0) process.exit(0);

  const reasons = [...new Set(matches.map((m) => m.reason))];
  process.stderr.write("[claude-rigor] Speculative language detected before stopping:\n");
  for (const r of reasons) process.stderr.write(`  - ${r}\n`);
  process.stderr.write("\nReplace assertion with evidence:\n");
  process.stderr.write("  1. Run a command or test that confirms the claim.\n");
  process.stderr.write('  2. Rewrite "should work"/"probably" as "confirmed: <observed output>".\n');
  process.exit(2);
}

main().catch(() => process.exit(0));
