import type { PluginInput } from "@opencode-ai/plugin";
import type { LuthierConfig } from "../config/schema.js";
import type { TemplateContext } from "./engine.js";

/**
 * Allowlisted environment variable prefixes.
 * Only variables matching these prefixes are exposed to templates
 * to prevent leaking secrets.
 */
const ENV_ALLOWLIST_PREFIXES = ["NODE_", "BUN_", "LANG", "SHELL", "TERM", "EDITOR", "HOME", "USER"];

/**
 * Allowlisted exact environment variable names.
 */
const ENV_ALLOWLIST_EXACT = new Set(["PATH", "PWD", "HOSTNAME", "CI", "DEBUG"]);

/**
 * Filter environment variables to a safe subset.
 */
function filterEnv(env: NodeJS.ProcessEnv): Record<string, string> {
	const filtered: Record<string, string> = {};
	for (const [key, value] of Object.entries(env)) {
		if (value === undefined) continue;
		if (ENV_ALLOWLIST_EXACT.has(key)) {
			filtered[key] = value;
			continue;
		}
		for (const prefix of ENV_ALLOWLIST_PREFIXES) {
			if (key.startsWith(prefix)) {
				filtered[key] = value;
				break;
			}
		}
	}
	return filtered;
}

/**
 * Build the template context from luthier config and plugin context.
 *
 * Available template variables:
 *   - project.directory — project root path
 *   - project.name — basename of project directory
 *   - config.* — full LuthierConfig tree
 *   - env.* — filtered environment variables (safe subset)
 *   - platform — process.platform (darwin, linux, win32)
 *   - date — current ISO date string (YYYY-MM-DD)
 *   - timestamp — current ISO timestamp
 */
export function buildTemplateContext(config: LuthierConfig, ctx: PluginInput): TemplateContext {
	const projectName = ctx.directory.split("/").pop() ?? ctx.directory;

	return {
		project: {
			directory: ctx.directory,
			name: projectName,
		},
		config,
		env: filterEnv(process.env),
		platform: process.platform,
		date: new Date().toISOString().slice(0, 10),
		timestamp: new Date().toISOString(),
	};
}
