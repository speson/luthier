import type { Hooks } from "@opencode-ai/plugin";
import type { LuthierConfig } from "../config/schema.js";
import { logVerbose } from "../shared/log.js";

/**
 * Match a permission request against a pattern.
 *
 * Pattern formats:
 *   - "Read"         — matches tool type exactly
 *   - "bash:rm *"    — matches "type:titlePattern" (glob-style * supported)
 *   - "*"            — matches everything
 *
 * Permission input has `type` (permission type), `title` (description),
 * and `metadata` (tool-specific details).
 */
function matchesPattern(pattern: string, permType: string, title: string): boolean {
	if (pattern === "*") return true;

	// "type:pattern" format — match permission type and then glob the title
	if (pattern.includes(":")) {
		const [typePattern, titlePattern] = pattern.split(":", 2);
		if (!matchGlob(typePattern, permType)) return false;
		if (!titlePattern) return true;
		return matchGlob(titlePattern, title);
	}

	// Plain name — match against permission type or title
	return matchGlob(pattern, permType) || matchGlob(pattern, title);
}

/**
 * Simple glob matching: supports * as wildcard for any characters.
 */
function matchGlob(pattern: string, text: string): boolean {
	const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
	return new RegExp(`^${escaped}$`, "i").test(text);
}

/**
 * Creates a `permission.ask` hook that auto-allows or auto-denies
 * tool executions based on user config patterns.
 *
 * When a tool execution requires permission:
 *   1. Check `auto_deny` patterns first (deny takes precedence)
 *   2. Check `auto_allow` patterns
 *   3. If no match, leave the default status ("ask") — the user will be prompted
 */
export function createPermissionHook(config: LuthierConfig): Hooks["permission.ask"] {
	const hookConfig = config.hooks["permission-handler"];
	const { auto_allow, auto_deny } = hookConfig;

	// No patterns configured — skip registration entirely
	if (auto_allow.length === 0 && auto_deny.length === 0) {
		return undefined;
	}

	return async (input, output) => {
		const permType = input.type ?? "";
		const title = input.title ?? "";
		const identifier = `${permType}${title ? `: ${title}` : ""}`;

		// Deny patterns take precedence
		for (const pattern of auto_deny) {
			if (matchesPattern(pattern, permType, title)) {
				output.status = "deny";
				logVerbose(`Permission denied by pattern "${pattern}": ${identifier}`);
				return;
			}
		}

		// Allow patterns
		for (const pattern of auto_allow) {
			if (matchesPattern(pattern, permType, title)) {
				output.status = "allow";
				logVerbose(`Permission auto-allowed by pattern "${pattern}": ${identifier}`);
				return;
			}
		}

		// No match — leave default "ask" status
		logVerbose(`Permission unmatched, will prompt user: ${identifier}`);
	};
}
