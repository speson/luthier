import type { Hooks } from "@opencode-ai/plugin";
import type { LuthierConfig } from "../config/schema.js";
import { globalScorer } from "../quality/scorer.js";
import { logVerbose } from "../shared/log.js";

/**
 * Creates an `experimental.chat.system.transform` hook that injects
 * validation requirements into the system prompt.
 *
 * Inspired by oh-my-opencode's "Atlas Trusts No One" philosophy:
 * the orchestrator must verify sub-agent results before accepting them.
 *
 * This hook injects verification instructions that become stronger
 * as the session's quality score degrades.
 */
export function createValidationGateHook(config: LuthierConfig): Hooks["experimental.chat.system.transform"] {
	// Validation gate is opt-in via experimental config
	const gateConfig = config.experimental.validation_gate as { enabled?: boolean } | undefined;

	if (!gateConfig?.enabled) {
		return undefined;
	}

	return async (input, output) => {
		const sessionId = input.sessionID;
		if (!sessionId) return;

		const score = globalScorer.getScore(sessionId);

		// Always inject base validation reminder
		output.system.push(BASE_VALIDATION_PROMPT);

		// Inject stronger guidance when quality is degrading
		if (score.successRate < 70 && score.totalToolCalls > 5) {
			output.system.push(DEGRADED_QUALITY_PROMPT);
			logVerbose(`Validation gate: degraded quality (${score.successRate.toFixed(0)}%) — injecting stricter guidance`);
		}

		if (score.consecutiveFailures >= 2) {
			output.system.push(CONSECUTIVE_FAILURE_PROMPT);
			logVerbose(`Validation gate: ${score.consecutiveFailures} consecutive failures — injecting recovery guidance`);
		}
	};
}

const BASE_VALIDATION_PROMPT = `<validation-requirements>
After completing any sub-task or delegation:
1. Verify the result matches the original requirement
2. Check that no unintended changes were introduced
3. Run diagnostics (lsp_diagnostics, build, tests) on changed files
4. Do NOT accept "done" claims without evidence
</validation-requirements>`;

const DEGRADED_QUALITY_PROMPT = `<quality-warning>
Session quality score is below 70%. Multiple operations have failed.
Before making more changes:
- STOP and review what's gone wrong so far
- Consider reverting to a known-good state
- Take a simpler, more incremental approach
</quality-warning>`;

const CONSECUTIVE_FAILURE_PROMPT = `<consecutive-failure-warning>
Multiple consecutive operations have failed.
DO NOT continue with the same approach.
1. Revert your last change
2. Re-read the error messages carefully
3. Try a fundamentally different approach
4. If stuck after 3 attempts, ask the user for guidance
</consecutive-failure-warning>`;
