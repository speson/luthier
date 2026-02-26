import type { Hooks } from "@opencode-ai/plugin";
import type { LuthierConfig } from "../config/schema.js";
import { logVerbose } from "../shared/log.js";

/**
 * AI slop patterns to detect in tool output.
 *
 * These are common patterns that indicate AI-generated code
 * that's unnecessarily verbose, unsafe, or poorly structured.
 */
const SLOP_PATTERNS: Array<{ pattern: RegExp; message: string }> = [
	{
		pattern: /as\s+any/g,
		message: "Type safety bypass: `as any` detected. Use proper types instead.",
	},
	{
		pattern: /@ts-ignore/g,
		message: "Type suppression: `@ts-ignore` detected. Fix the type error instead.",
	},
	{
		pattern: /@ts-expect-error/g,
		message: "Type suppression: `@ts-expect-error` detected. Fix the type error instead.",
	},
	{
		pattern: /catch\s*\([^)]*\)\s*\{\s*\}/g,
		message: "Empty catch block detected. Handle the error or at minimum log it.",
	},
	{
		pattern: /\/\/\s*TODO:?\s*$/gm,
		message: "Bare TODO comment without description. Either implement or describe what's needed.",
	},
	{
		pattern: /console\.log\(/g,
		message: "Raw console.log detected. Use the project's logging utility instead.",
	},
];

/**
 * Creates a `tool.execute.after` hook that detects AI slop patterns
 * in tool output and appends warnings.
 *
 * This hook monitors tool output (especially file edits) for common
 * anti-patterns that indicate low-quality AI-generated code.
 *
 * Only active for tools that produce code output (file edits, bash).
 */
export function createCodeSimplifierHook(config: LuthierConfig): Hooks["tool.execute.after"] {
	// Code simplifier is opt-in via experimental config
	const simplifierConfig = config.experimental.code_simplifier as { enabled?: boolean } | undefined;

	if (!simplifierConfig?.enabled) {
		return undefined;
	}

	const codeTools = new Set(["edit", "write", "bash", "mcp_edit", "mcp_write", "mcp_bash"]);

	return async (input, output) => {
		// Only check code-producing tools
		if (!codeTools.has(input.tool)) return;

		const content = output.output ?? "";
		if (!content) return;

		const warnings: string[] = [];

		for (const { pattern, message } of SLOP_PATTERNS) {
			// Reset regex state (global flag)
			pattern.lastIndex = 0;
			const matches = content.match(pattern);
			if (matches && matches.length > 0) {
				warnings.push(`- ${message} (${matches.length} occurrence${matches.length > 1 ? "s" : ""})`);
			}
		}

		if (warnings.length > 0) {
			const warningBlock = `\n\n[luthier: Code Quality Warning]\n${warnings.join("\n")}`;
			output.output = `${content}${warningBlock}`;
			logVerbose(`Code simplifier: ${warnings.length} warning(s) for ${input.tool}`);
		}
	};
}
