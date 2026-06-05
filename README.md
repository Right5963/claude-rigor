# claude-rigor

[![npm version](https://img.shields.io/npm/v/claude-rigor.svg)](https://www.npmjs.com/package/claude-rigor)
[![license](https://img.shields.io/npm/l/claude-rigor.svg)](./LICENSE)
[![node](https://img.shields.io/node/v/claude-rigor.svg)](https://nodejs.org)

**Evidence-over-assertion guardrails for [Claude Code](https://claude.com/claude-code).**

Two hooks that mechanically enforce the disciplines that make an AI coding
agent trustworthy:

1. **Declare intent before editing.** Block `Write`/`Edit`/`MultiEdit` unless a
   goal was stated first.
2. **Evidence before "done".** Catch speculative language (`probably`,
   `should work`, `たぶん`, `だと思う`, …) when the agent tries to end its turn,
   and push it to verify instead.

These are *behavioral* failure modes — prompting alone does not reliably stop
them. A hook does, because the platform actually blocks the action.

```
$ # agent tries to edit a file without saying why
[claude-rigor] declare a goal before editing. Add "Goal: <what this achieves>" and retry.

$ # agent tries to stop after "this should fix it"
[claude-rigor] Speculative language detected before stopping:
  - should work (unverified claim)
Replace assertion with evidence:
  1. Run a command or test that confirms the claim.
  2. Rewrite "should work"/"probably" as "confirmed: <observed output>".
```

## Install

```bash
# into the current project (./.claude)
npx claude-rigor init

# or globally, for every project (~/.claude)
npx claude-rigor init --global
```

Restart Claude Code (or start a new session) to load the hooks. That's it.

## What it installs

`init` does two things and **never overwrites your existing settings**:

- Copies the compiled hook scripts into `<.claude>/hooks/claude-rigor/`.
- Merges two entries into `<.claude>/settings.json`:
  - a `PreToolUse` hook matching `Write|Edit|MultiEdit` (the goal gate)
  - a `Stop` hook (the speculation check)

Re-running `init` is idempotent — it will not duplicate entries.

## Configuration (optional)

Drop a `claude-rigor.json` next to your `settings.json`. Everything is
optional; omitted fields keep their defaults.

```json
{
  "speculation": {
    "enabled": true,
    "lookbackMessages": 5,
    "phrases": ["probably", "should work", "たぶん", "だと思う"]
  },
  "goal": {
    "enabled": true,
    "lookbackMessages": 20,
    "markers": ["Goal:", "ゴール:"]
  }
}
```

- `phrases` — replaces the built-in speculation list. ASCII phrases match on
  word boundaries; non-ASCII (e.g. Japanese) match literally.
- `markers` — the strings that count as a declared goal.
- Set `enabled: false` on either section to turn that rule off.

## How it works

Claude Code exposes [lifecycle hooks](https://code.claude.com/docs/en/hooks)
that run a command and can block the action. claude-rigor uses two:

| Hook         | Event        | Action on violation                                  |
| ------------ | ------------ | ---------------------------------------------------- |
| goal gate    | `PreToolUse` | `permissionDecision: "deny"` — the edit is refused   |
| speculation  | `Stop`       | `exit 2` — the agent keeps going and must add evidence |

The agent's own message text is only reachable at `Stop` time (the
`MessageDisplay` hook is display-only and cannot block), so speculation is
checked at the turn boundary by reading the transcript — not by intercepting
the message mid-stream.

**Fail-open by design:** if the transcript is missing or anything errors, the
hook exits `0` and does nothing. A guardrail that breaks your agent on its own
bug is worse than no guardrail.

**CommonJS, cross-platform:** hooks ship as CommonJS so bare `node script.js`
works on Windows, macOS, and Linux without `type: module` issues.

## Development

```bash
npm install
npm test          # vitest, pure-logic unit tests
npm run build     # tsc -> dist/
```

The detectors (`speculation`, `goal-declaration`), transcript parser, config
merge, and settings merge are pure functions with full unit coverage. The hook
entry scripts and CLI are thin I/O shells over that tested logic.

## Limitations

claude-rigor matches patterns; it does not understand context. Be honest about what that means:

- **Speculation detection is regex-based.** It can false-positive on a legitimate use of a flagged word, and it can miss paraphrased uncertainty. Code spans (backticks) are stripped to reduce noise and the phrase list is configurable, but it is not semantic. An optional LLM-based mode is on the roadmap.
- **The goal gate checks for a marker, not a *good* goal.** Writing `Goal: x` satisfies it. It enforces the habit of stating intent, not the quality of that intent.
- **The Stop hook is intentionally strict** and can add friction. That is the trade: a little friction for evidence over assertion. Tune the phrase list or disable a rule in `claude-rigor.json` if it gets in your way.

It is a focused, supplementary guardrail — not a substitute for review. Fail-open by design: if anything errors, the hook does nothing rather than blocking you.

## License

MIT © Right5963
