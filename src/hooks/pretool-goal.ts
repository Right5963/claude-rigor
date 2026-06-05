#!/usr/bin/env node
/**
 * PreToolUse hook (matcher Write|Edit|MultiEdit): denies a destructive edit
 * unless a goal was declared in recent assistant output. Returns a JSON deny
 * decision per the Claude Code hooks protocol.
 *
 * Fails open: any error or missing transcript exits 0 (never blocks on a bug).
 */
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { readStdin } from "../stdin";
import { readTranscript, lastAssistantTexts } from "../transcript";
import { hasGoalDeclaration, DEFAULT_GOAL_MARKERS } from "../detectors/goal-declaration";
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
  if (!cfg.goal.enabled) process.exit(0);

  const markers = cfg.goal.markers ?? DEFAULT_GOAL_MARKERS;
  const combined = lastAssistantTexts(
    readTranscript(transcriptPath),
    cfg.goal.lookbackMessages,
  ).join("\n");

  if (hasGoalDeclaration(combined, markers)) process.exit(0);

  const decision = {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason:
        'claude-rigor: declare a goal before editing. Add a line like "Goal: <what this change achieves>" (or "ゴール:") to your message, then retry the edit.',
    },
  };
  process.stdout.write(JSON.stringify(decision));
  process.exit(0);
}

main().catch(() => process.exit(0));
