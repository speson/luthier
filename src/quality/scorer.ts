import { logVerbose } from "../shared/log.js";

/**
 * Quality score for a session — tracks success/failure metrics.
 */
export interface QualityScore {
	sessionId: string;
	totalToolCalls: number;
	successfulCalls: number;
	failedCalls: number;
	consecutiveFailures: number;
	/** Success rate as a percentage (0-100). */
	successRate: number;
}

/**
 * In-memory quality scorer that tracks tool call outcomes per session.
 *
 * Used by the circuit breaker and validation gate to make quality decisions.
 * Scores are ephemeral — reset each session restart.
 */
export class QualityScorer {
	private scores = new Map<string, QualityScore>();

	/**
	 * Get or create a quality score for a session.
	 */
	getScore(sessionId: string): QualityScore {
		let score = this.scores.get(sessionId);
		if (!score) {
			score = {
				sessionId,
				totalToolCalls: 0,
				successfulCalls: 0,
				failedCalls: 0,
				consecutiveFailures: 0,
				successRate: 100,
			};
			this.scores.set(sessionId, score);
		}
		return score;
	}

	/**
	 * Record a successful tool call.
	 */
	recordSuccess(sessionId: string): void {
		const score = this.getScore(sessionId);
		score.totalToolCalls++;
		score.successfulCalls++;
		score.consecutiveFailures = 0;
		score.successRate = (score.successfulCalls / score.totalToolCalls) * 100;
		logVerbose(`Quality: ${sessionId} success (rate: ${score.successRate.toFixed(1)}%)`);
	}

	/**
	 * Record a failed tool call.
	 */
	recordFailure(sessionId: string): void {
		const score = this.getScore(sessionId);
		score.totalToolCalls++;
		score.failedCalls++;
		score.consecutiveFailures++;
		score.successRate = (score.successfulCalls / score.totalToolCalls) * 100;
		logVerbose(`Quality: ${sessionId} failure #${score.consecutiveFailures} (rate: ${score.successRate.toFixed(1)}%)`);
	}

	/**
	 * Check if consecutive failures have exceeded a threshold.
	 */
	isCircuitBroken(sessionId: string, threshold: number): boolean {
		const score = this.getScore(sessionId);
		return score.consecutiveFailures >= threshold;
	}
}

/**
 * Singleton quality scorer instance shared across hooks.
 */
export const globalScorer = new QualityScorer();
