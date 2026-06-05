/**
 * Goal-declaration detector.
 *
 * Decides whether recent assistant text contains an explicit statement of
 * intent before a destructive edit. The markers are configurable; defaults
 * cover English ("Goal:") and Japanese ("ゴール:").
 */

/** Default markers that count as a declared goal. */
export const DEFAULT_GOAL_MARKERS: readonly string[] = ["Goal:", "ゴール:", "ゴール：", "## Goal", "## ゴール"];

/**
 * Returns true if any marker appears in the text (case-insensitive).
 * Empty text returns false.
 */
export function hasGoalDeclaration(
  text: string,
  markers: readonly string[] = DEFAULT_GOAL_MARKERS,
): boolean {
  if (!text) return false;
  const haystack = text.toLowerCase();
  return markers.some((m) => haystack.includes(m.toLowerCase()));
}
