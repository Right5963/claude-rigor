import { describe, it, expect } from "vitest";
import { hasGoalDeclaration, DEFAULT_GOAL_MARKERS } from "./goal-declaration";

describe("hasGoalDeclaration", () => {
  it("returns false for empty text", () => {
    expect(hasGoalDeclaration("")).toBe(false);
  });

  it("returns false when no marker is present", () => {
    expect(hasGoalDeclaration("Let me just edit this file quickly.")).toBe(false);
  });

  it("detects English 'Goal:' marker", () => {
    expect(hasGoalDeclaration("Goal: add a retry to the fetch call")).toBe(true);
  });

  it("detects Japanese 'ゴール:' marker", () => {
    expect(hasGoalDeclaration("ゴール: リトライを追加する")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(hasGoalDeclaration("goal: lowercase works")).toBe(true);
  });

  it("detects a heading-style marker", () => {
    expect(hasGoalDeclaration("## Goal\nDo the thing")).toBe(true);
  });

  it("honours custom markers", () => {
    expect(hasGoalDeclaration("INTENT: refactor", ["INTENT:"])).toBe(true);
    expect(hasGoalDeclaration("Goal: x", ["INTENT:"])).toBe(false);
  });
});

describe("DEFAULT_GOAL_MARKERS", () => {
  it("is non-empty", () => {
    expect(DEFAULT_GOAL_MARKERS.length).toBeGreaterThan(0);
  });
});
