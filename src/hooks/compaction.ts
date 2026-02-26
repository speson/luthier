import type { Hooks } from "@opencode-ai/plugin";
import type { LuthierConfig } from "../config/schema.js";
import { logVerbose } from "../shared/log.js";

/**
 * Creates an `experimental.session.compacting` hook that customizes
 * how session context is compacted when it exceeds limits.
 *
 * Two modes:
 *   1. `context` — additional strings appended to the default compaction prompt
 *   2. `prompt` — completely replaces the default compaction prompt
 *
 * Use cases:
 *   - Preserve key context: `{ "context": ["Always preserve file paths mentioned"] }`
 *   - Custom compaction: `{ "prompt": "Summarize focusing on code changes only" }`
 */
export function createCompactionHook(config: LuthierConfig): Hooks["experimental.session.compacting"] {
	const hookConfig = config.hooks.compaction;
	const { context, prompt } = hookConfig;

	const hasContext = context.length > 0;
	const hasPrompt = prompt !== undefined;

	// Nothing to customize
	if (!hasContext && !hasPrompt) {
		return undefined;
	}

	return async (_input, output) => {
		// Append context strings
		for (const ctx of context) {
			output.context.push(ctx);
		}

		// Override compaction prompt if specified
		if (hasPrompt) {
			output.prompt = prompt;
			logVerbose("Compaction prompt overridden by user config");
		}

		logVerbose(`Compaction: ${context.length} context string(s)${hasPrompt ? " + custom prompt" : ""}`);
	};
}
