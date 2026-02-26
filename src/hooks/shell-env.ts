import type { Hooks } from "@opencode-ai/plugin";
import type { LuthierConfig } from "../config/schema.js";
import { logVerbose } from "../shared/log.js";

/**
 * Creates a `shell.env` hook that injects environment variables
 * into every shell/tool execution.
 *
 * Two modes:
 *   1. `vars` — static key-value pairs injected directly
 *   2. `forward` — env var names forwarded from the host process
 *
 * Use cases:
 *   - Inject API keys: `{ "vars": { "MY_TOKEN": "xxx" } }`
 *   - Forward host env: `{ "forward": ["AWS_PROFILE", "KUBECONFIG"] }`
 *   - Set CI flags: `{ "vars": { "CI": "true" } }`
 */
export function createShellEnvHook(config: LuthierConfig): Hooks["shell.env"] {
	const hookConfig = config.hooks["shell-env"];
	const { vars, forward } = hookConfig;

	const hasVars = Object.keys(vars).length > 0;
	const hasForward = forward.length > 0;

	// Nothing to inject
	if (!hasVars && !hasForward) {
		return undefined;
	}

	return async (_input, output) => {
		// Inject static vars
		for (const [key, value] of Object.entries(vars)) {
			output.env[key] = value;
		}

		// Forward from host process
		for (const key of forward) {
			const value = process.env[key];
			if (value !== undefined) {
				output.env[key] = value;
				logVerbose(`Forwarded env: ${key}`);
			} else {
				logVerbose(`Env not found on host, skipping: ${key}`);
			}
		}

		logVerbose(`Shell env: ${Object.keys(vars).length} static + ${forward.length} forwarded`);
	};
}
