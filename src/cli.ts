#!/usr/bin/env node
/**
 * claude-rigor CLI.
 *
 *   claude-rigor init            install into ./.claude
 *   claude-rigor init --global   install into ~/.claude
 *   claude-rigor init --dir DIR  install into DIR (a .claude directory)
 *
 * Installation copies the compiled hook scripts into
 * `<.claude>/hooks/claude-rigor/` and merges the hook entries into
 * `<.claude>/settings.json` without overwriting existing settings.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, cpSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { mergeSettings, type ClaudeSettings } from "./install";

interface CliOptions {
  command: string;
  global: boolean;
  dir?: string;
}

function out(message: string): void {
  process.stdout.write(message + "\n");
}

function parseArgs(argv: string[]): CliOptions {
  const args = argv.slice(2);
  const command = args[0] ?? "help";
  let global = false;
  let dir: string | undefined;
  for (let i = 1; i < args.length; i++) {
    if (args[i] === "--global" || args[i] === "-g") global = true;
    else if (args[i] === "--dir") dir = args[++i];
  }
  return { command, global, dir };
}

function targetClaudeDir(opts: CliOptions): string {
  if (opts.dir) return resolve(opts.dir);
  if (opts.global) return join(homedir(), ".claude");
  return resolve(".claude");
}

function init(opts: CliOptions): void {
  const claudeDir = targetClaudeDir(opts);
  const installDir = join(claudeDir, "hooks", "claude-rigor");
  const distDir = __dirname; // the compiled dist/ folder

  mkdirSync(installDir, { recursive: true });
  cpSync(distDir, installDir, { recursive: true });

  const settingsPath = join(claudeDir, "settings.json");
  let existing: ClaudeSettings = {};
  if (existsSync(settingsPath)) {
    try {
      existing = JSON.parse(readFileSync(settingsPath, "utf8")) as ClaudeSettings;
    } catch {
      existing = {};
    }
  }
  const merged = mergeSettings(existing, installDir);
  mkdirSync(dirname(settingsPath), { recursive: true });
  writeFileSync(settingsPath, JSON.stringify(merged, null, 2) + "\n");

  out(`claude-rigor installed:`);
  out(`  hooks  -> ${installDir}`);
  out(`  config -> ${settingsPath}`);
  out(`Restart Claude Code (or start a new session) to load the hooks.`);
}

function help(): void {
  out("claude-rigor — evidence-over-assertion guardrails for Claude Code");
  out("");
  out("Usage:");
  out("  claude-rigor init             install into ./.claude");
  out("  claude-rigor init --global    install into ~/.claude");
  out("  claude-rigor init --dir DIR   install into a specific .claude dir");
}

function run(): void {
  const opts = parseArgs(process.argv);
  switch (opts.command) {
    case "init":
      init(opts);
      break;
    default:
      help();
  }
}

run();
