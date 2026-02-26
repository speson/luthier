import type { Hooks, PluginInput } from "@opencode-ai/plugin";
import type { LuthierConfig } from "../config/schema.js";
import { log, logVerbose } from "../shared/log.js";
import { findPlaybookEntries, formatPlaybookAdvice } from "./failure-playbook.js";
import { globalScorer } from "./scorer.js";

/**
 * Default consecutive failure threshold before the circuit breaker trips.
 */
const DEFAULT_FAILURE_THRESHOLD = 3;

/**
 * Creates a `tool.execute.after` hook that implements the circuit breaker pattern.
 *
 * Monitors tool execution results and:
 *   1. Tracks success/failure via the quality scorer
 *   2. Injects failure playbook advice when errors are detected
 *   3. Logs warnings when consecutive failures approach the threshold
 *
 * The circuit breaker doesn't hard-stop the agent (that would be disruptive),
 * but injects strong guidance to stop and reassess.
 */
export function createCircuitBreakerHook(config: LuthierConfig, _ctx: PluginInput): Hooks["tool.execute.after"] {
	const threshold = (config.experimental.circuit_breaker_threshold as number | undefined) ?? DEFAULT_FAILURE_THRESHOLD;

	return async (input, output) => {
		const sessionId = input.sessionID;
		const toolOutput = output.output ?? "";

		// Heuristic: detect failure from output content
		const isFailure = detectFailure(toolOutput, output.title);

		if (isFailure) {
			globalScorer.recordFailure(sessionId);

			// Inject playbook advice into output
			const entries = findPlaybookEntries(toolOutput);
			if (entries.length > 0) {
				const advice = formatPlaybookAdvice(entries);
				output.output = `${toolOutput}\n\n${advice}`;
			}

			// Check circuit breaker threshold
			const score = globalScorer.getScore(sessionId);
			if (score.consecutiveFailures >= threshold) {
				log(
					`⚠ Circuit breaker: ${score.consecutiveFailures} consecutive failures in session ${sessionId}. Injecting stop guidance.`,
				);
				output.output = `${output.output}\n\n[luthier: CIRCUIT BREAKER] ${score.consecutiveFailures} consecutive failures detected. STOP making changes. Revert to last working state, review what went wrong, and try a different approach.`;
			}
		} else {
			globalScorer.recordSuccess(sessionId);
		}

		logVerbose(`Circuit breaker: ${input.tool} → ${isFailure ? "failure" : "success"}`);
	};
}

/**
 * Heuristic failure detection from tool output.
 *
 * Looks for common error patterns in the output text.
 * Not perfect, but catches the majority of failure cases.
 */
function detectFailure(output: string, title: string): boolean {
	const errorPatterns = [
		/error/i,
		/failed/i,
		/exception/i,
		/ENOENT/,
		/EACCES/,
		/exit code [1-9]/i,
		/command not found/i,
		/cannot find/i,
		/compilation failed/i,
	];

	// Ignore common false positives
	const falsePositives = [/0 error/i, /no error/i, /error handling/i, /error boundary/i, /error\.ts/i, /logError/i];

	const text = `${title} ${output}`;

	const hasError = errorPatterns.some((p) => p.test(text));
	if (!hasError) return false;

	const isFalsePositive = falsePositives.some((p) => p.test(text));
	return !isFalsePositive;
}
