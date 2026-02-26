/**
 * Failure playbook — error-type-specific recovery suggestions.
 *
 * Maps common error patterns to actionable recovery strategies.
 * Injected into the system prompt when failures are detected,
 * guiding the agent toward proper recovery instead of shotgun debugging.
 */

export interface PlaybookEntry {
	/** Error pattern to match (regex). */
	pattern: RegExp;
	/** Human-readable error category. */
	category: string;
	/** Recovery suggestion injected into system prompt. */
	suggestion: string;
}

/**
 * Built-in failure playbook entries.
 */
export const FAILURE_PLAYBOOK: PlaybookEntry[] = [
	{
		pattern: /type\s*error|TS\d{4}/i,
		category: "Type Error",
		suggestion:
			"Type error detected. Check the exact error message, verify function signatures and import types. Do NOT use `as any` or `@ts-ignore` to suppress.",
	},
	{
		pattern: /cannot find module|module not found|no such file/i,
		category: "Module Not Found",
		suggestion:
			"Module import failed. Verify the file path exists, check for typos in the import path, and ensure the module is installed (`bun install`).",
	},
	{
		pattern: /syntax error|unexpected token/i,
		category: "Syntax Error",
		suggestion:
			"Syntax error in code. Read the exact error location, check for missing brackets, semicolons, or malformed expressions. Do NOT make random changes.",
	},
	{
		pattern: /ENOENT|file not found|no such file or directory/i,
		category: "File Not Found",
		suggestion:
			"File system operation failed — file doesn't exist. Verify the path with `ls` before operating on it. Check for case sensitivity.",
	},
	{
		pattern: /permission denied|EACCES/i,
		category: "Permission Error",
		suggestion:
			"Permission denied. Check file permissions. Do NOT use `chmod 777`. Identify the correct owner/group and set minimal permissions.",
	},
	{
		pattern: /timeout|ETIMEDOUT|ECONNREFUSED/i,
		category: "Network/Timeout",
		suggestion:
			"Network operation timed out or connection refused. Verify the service is running, check the URL/port, and consider retry with backoff.",
	},
	{
		pattern: /out of memory|heap|allocation/i,
		category: "Memory Error",
		suggestion:
			"Memory issue detected. Look for unbounded data structures, large file reads without streaming, or infinite loops. Consider chunking operations.",
	},
	{
		pattern: /test.*fail|assertion.*error|expect.*received/i,
		category: "Test Failure",
		suggestion:
			"Test failed. Read the assertion diff carefully. Fix the implementation to match the test expectations — do NOT modify tests to pass unless the test itself is wrong.",
	},
	{
		pattern: /build.*fail|compilation.*error/i,
		category: "Build Failure",
		suggestion:
			"Build failed. Check the build output for the first error (later errors are often cascading). Fix root cause, not symptoms.",
	},
	{
		pattern: /lint.*error|eslint|biome/i,
		category: "Lint Error",
		suggestion:
			"Linting error. Fix the code to conform to the linting rules. Do NOT disable the rule unless it's genuinely wrong for this case.",
	},
];

/**
 * Find matching playbook entries for an error message.
 */
export function findPlaybookEntries(errorOutput: string): PlaybookEntry[] {
	return FAILURE_PLAYBOOK.filter((entry) => entry.pattern.test(errorOutput));
}

/**
 * Format playbook suggestions for system prompt injection.
 */
export function formatPlaybookAdvice(entries: PlaybookEntry[]): string {
	if (entries.length === 0) return "";

	const advice = entries.map((e) => `[${e.category}]: ${e.suggestion}`).join("\n");

	return `<failure-recovery-guide>
The following error patterns were detected. Follow these recovery strategies:

${advice}

CRITICAL: Fix the root cause. Do NOT shotgun debug (random changes hoping something works).
After each fix attempt, re-verify before moving on.
</failure-recovery-guide>`;
}
