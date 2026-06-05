# claude-rigor — Design

**Date:** 2026-06-05
**Status:** Approved, in implementation

## Problem

AI coding agents (Claude Code and similar) tend to:

1. **Edit code without a stated intent** — jumping straight to modifying files on
   reflexive impulse, which produces churn and unwanted changes.
2. **Assert without evidence** — saying "this should work", "probably fixed",
   "no issues" without actually running anything to confirm.

These are the two failure modes that erode trust in an autonomous agent. They
are behavioral, not knowledge gaps, so prompting alone does not reliably fix
them. A *mechanical* guardrail does.

Claude Code exposes a hook system that can run arbitrary commands at lifecycle
events and **block** actions. `claude-rigor` uses that system to enforce two
disciplines mechanically.

## What the platform actually allows (verified against official docs)

Verified at `https://code.claude.com/docs/en/hooks`:

- `PreToolUse` fires before a tool runs and **can block it** via either
  `exit 2` (stderr → agent) or JSON `{ permissionDecision: "deny" }`.
- `Stop` fires when the agent tries to end its turn. Returning `exit 2` blocks
  the stop, feeding stderr back so the agent continues and addresses it.
- The assistant's own output text is only reachable by `MessageDisplay`, which
  is **display-only and cannot block**. Therefore speculation enforcement is
  done at `Stop` time (read the transcript), not by intercepting the message.

This constraint is the central design decision: speculation cannot be blocked
mid-message, so it is caught at the turn boundary instead.

## Components

Each unit has one purpose, a typed interface, and is testable in isolation.

### `src/detectors/speculation.ts`
Pure function. Input: a block of assistant text. Output: list of matched
speculative phrases with positions. Code spans wrapped in backticks are
stripped before matching to avoid false positives (e.g. discussing the word
`probably` in documentation). The phrase list is data, not hardcoded logic, so
it can be overridden by config.

### `src/detectors/goal-declaration.ts`
Pure function. Input: recent assistant text. Output: whether a goal
declaration is present (looks for the configured marker lines, e.g. `Goal:` /
`ゴール:`). Used to decide whether an edit is allowed.

### `src/transcript.ts`
Reads a Claude Code transcript `.jsonl` file and returns the most recent
assistant text message. Isolates all file/format concerns from the detectors.

### `src/config.ts`
Loads optional user config (`.claude/claude-rigor.json`): custom phrase lists,
goal markers, and an enable/disable flag per rule. Ships with sane defaults so
zero-config works.

### `src/hooks/pretool-goal.ts`
`PreToolUse` entry (matcher `Write|Edit|MultiEdit`). Reads hook JSON from
stdin, pulls recent assistant text from the transcript, runs
`goal-declaration`, and emits `permissionDecision: "deny"` with a helpful
reason when no goal is declared.

### `src/hooks/stop-speculation.ts`
`Stop` entry. Reads the last assistant message via `transcript.ts`, runs
`speculation`, and on a hit exits `2` with a message listing the phrases and
asking for evidence.

### `src/cli.ts`
`claude-rigor init [--global]`. Installs the hooks: copies the built hook
scripts into `<.claude>/hooks/claude-rigor/` and **merges** (never overwrites)
the hook entries into `<.claude>/settings.json`. `--global` targets `~/.claude`,
default targets `./.claude`.

## Data flow

```
Claude Code lifecycle
   │
   ├─ before Write/Edit ─► pretool-goal ─► transcript ─► goal-declaration ─► allow / deny
   │
   └─ on Stop ──────────► stop-speculation ─► transcript ─► speculation ─► continue / block(exit 2)
```

## Distribution decision: CommonJS

Hook scripts are shipped as CommonJS (`require`), not ESM. Claude Code runs
hooks as bare `node script.js`; when the script lands in a directory without a
`type: "module"` package.json, ESM `import` syntax throws
`require is not defined in ES module scope` on Windows. CommonJS is the robust
choice across Win/Mac/Linux. The whole project is therefore compiled to
CommonJS.

## Error handling

Hooks must **fail open**: if the transcript is missing, malformed, or any
unexpected error occurs, the hook exits `0` (no decision) rather than blocking
the user's workflow. A guardrail that breaks the agent on its own bug is worse
than no guardrail. All entry points wrap their logic in try/catch.

## Testing

- Vitest unit tests for `speculation`, `goal-declaration`, and `transcript`
  (the pure/logic units), targeting 80%+ coverage of `src`.
- Detectors are pure functions, so tests are plain input→output assertions
  (AAA pattern).
- Hook entry scripts and the CLI installer are thin I/O shells over tested
  logic; covered by manual/integration verification rather than unit mocks.

## Out of scope (v0.1)

- `MessageDisplay`-based inline highlighting (deferred; Stop-time enforcement
  is sufficient and stronger for v1).
- Telemetry, dashboards, multi-agent/team hooks.
