import type { Hooks } from "@opencode-ai/plugin";
import type { LuthierConfig } from "../config/schema.js";
import { log, logVerbose } from "../shared/log.js";

/**
 * Creates a `tool.execute.before` hook that:
 *   1. Blocks execution of tools in the `blocked_tools` list
 *   2. Logs tool invocations in verbose mode
 *
 * Blocked tools have their args set to a marker that signals "skip".
 * In practice, setting args to `undefined` causes the tool to gracefully fail.
 */
export function createToolBeforeHook(config: LuthierConfig): Hooks["tool.execute.before"] {
	const hookConfig = config.hooks["tool-interceptor"];
	const { blocked_tools } = hookConfig;

	// Nothing to intercept
	if (blocked_tools.length === 0) {
		return undefined;
	}

	const blockedSet = new Set(blocked_tools);

	return async (input, output) => {
		if (blockedSet.has(input.tool)) {
			log(`Tool blocked: ${input.tool} (session: ${input.sessionID})`);
			// Set args to undefined to prevent execution
			output.args = undefined;
			return;
		}

		logVerbose(`Tool executing: ${input.tool} (session: ${input.sessionID})`);
	};
}

/**
 * Creates a `tool.execute.after` hook that truncates long tool output.
 *
 * This prevents context window bloat from tools that return massive output
 * (e.g. large file reads, verbose build logs).
 *
 * Truncation-exempt tools (configured via `truncation_exempt`) are never truncated.
 */
export function createToolAfterHook(config: LuthierConfig): Hooks["tool.execute.after"] {
	const hookConfig = config.hooks["tool-interceptor"];
	const { max_output_length, truncation_exempt } = hookConfig;

	// No truncation configured
	if (max_output_length === 0) {
		return undefined;
	}

	const exemptSet = new Set(truncation_exempt);

	return async (input, output) => {
		if (exemptSet.has(input.tool)) {
			return;
		}

		if (output.output && output.output.length > max_output_length) {
			const original = output.output.length;
			output.output = `${output.output.slice(0, max_output_length)}\n\n[luthier] Output truncated: ${original.toLocaleString()} → ${max_output_length.toLocaleString()} chars`;
			logVerbose(`Truncated output for ${input.tool}: ${original} → ${max_output_length}`);
		}
	};
}
