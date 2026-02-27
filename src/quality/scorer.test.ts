import { beforeEach, describe, expect, it, spyOn } from "bun:test";
import { QualityScorer } from "./scorer.js";

describe("QualityScorer", () => {
	let scorer: QualityScorer;

	beforeEach(() => {
		scorer = new QualityScorer();
		// Suppress verbose logging
		spyOn(console, "log").mockImplementation(() => {});
	});

	describe("getScore", () => {
		it("creates new score with defaults", () => {
			const score = scorer.getScore("session-1");
			expect(score.sessionId).toBe("session-1");
			expect(score.totalToolCalls).toBe(0);
			expect(score.successfulCalls).toBe(0);
			expect(score.failedCalls).toBe(0);
			expect(score.consecutiveFailures).toBe(0);
			expect(score.successRate).toBe(100);
		});

		it("returns same score object for same session", () => {
			const score1 = scorer.getScore("session-1");
			const score2 = scorer.getScore("session-1");
			expect(score1).toBe(score2);
		});

		it("returns different scores for different sessions", () => {
			const score1 = scorer.getScore("session-1");
			const score2 = scorer.getScore("session-2");
			expect(score1).not.toBe(score2);
			expect(score1.sessionId).toBe("session-1");
			expect(score2.sessionId).toBe("session-2");
		});
	});

	describe("recordSuccess", () => {
		it("increments totalToolCalls and successfulCalls", () => {
			scorer.recordSuccess("s1");
			const score = scorer.getScore("s1");
			expect(score.totalToolCalls).toBe(1);
			expect(score.successfulCalls).toBe(1);
			expect(score.failedCalls).toBe(0);
		});

		it("resets consecutiveFailures to 0", () => {
			scorer.recordFailure("s1");
			scorer.recordFailure("s1");
			expect(scorer.getScore("s1").consecutiveFailures).toBe(2);
			scorer.recordSuccess("s1");
			expect(scorer.getScore("s1").consecutiveFailures).toBe(0);
		});

		it("calculates successRate correctly", () => {
			scorer.recordSuccess("s1");
			expect(scorer.getScore("s1").successRate).toBe(100);
			scorer.recordFailure("s1");
			expect(scorer.getScore("s1").successRate).toBe(50);
			scorer.recordSuccess("s1");
			const rate = scorer.getScore("s1").successRate;
			expect(Math.round(rate * 10) / 10).toBeCloseTo(66.7, 0);
		});
	});

	describe("recordFailure", () => {
		it("increments totalToolCalls, failedCalls, and consecutiveFailures", () => {
			scorer.recordFailure("s1");
			const score = scorer.getScore("s1");
			expect(score.totalToolCalls).toBe(1);
			expect(score.failedCalls).toBe(1);
			expect(score.consecutiveFailures).toBe(1);
		});

		it("accumulates consecutive failures", () => {
			scorer.recordFailure("s1");
			scorer.recordFailure("s1");
			scorer.recordFailure("s1");
			expect(scorer.getScore("s1").consecutiveFailures).toBe(3);
		});

		it("calculates successRate as 0 after all failures", () => {
			scorer.recordFailure("s1");
			scorer.recordFailure("s1");
			expect(scorer.getScore("s1").successRate).toBe(0);
		});
	});

	describe("isCircuitBroken", () => {
		it("returns false when below threshold", () => {
			scorer.recordFailure("s1");
			scorer.recordFailure("s1");
			expect(scorer.isCircuitBroken("s1", 3)).toBe(false);
		});

		it("returns true when at threshold", () => {
			scorer.recordFailure("s1");
			scorer.recordFailure("s1");
			scorer.recordFailure("s1");
			expect(scorer.isCircuitBroken("s1", 3)).toBe(true);
		});

		it("returns true when above threshold", () => {
			scorer.recordFailure("s1");
			scorer.recordFailure("s1");
			scorer.recordFailure("s1");
			scorer.recordFailure("s1");
			expect(scorer.isCircuitBroken("s1", 3)).toBe(true);
		});

		it("returns false for unknown session", () => {
			expect(scorer.isCircuitBroken("unknown", 3)).toBe(false);
		});

		it("resets after success", () => {
			scorer.recordFailure("s1");
			scorer.recordFailure("s1");
			scorer.recordFailure("s1");
			expect(scorer.isCircuitBroken("s1", 3)).toBe(true);
			scorer.recordSuccess("s1");
			expect(scorer.isCircuitBroken("s1", 3)).toBe(false);
		});
	});

	describe("session isolation", () => {
		it("tracks sessions independently", () => {
			scorer.recordFailure("s1");
			scorer.recordFailure("s1");
			scorer.recordSuccess("s2");

			expect(scorer.getScore("s1").consecutiveFailures).toBe(2);
			expect(scorer.getScore("s2").consecutiveFailures).toBe(0);
			expect(scorer.getScore("s1").failedCalls).toBe(2);
			expect(scorer.getScore("s2").successfulCalls).toBe(1);
		});
	});
});
