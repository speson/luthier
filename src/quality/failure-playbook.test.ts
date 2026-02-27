import { describe, expect, it } from "bun:test";
import { FAILURE_PLAYBOOK, findPlaybookEntries, formatPlaybookAdvice } from "./failure-playbook.js";

describe("FAILURE_PLAYBOOK", () => {
	it("has entries for common error types", () => {
		expect(FAILURE_PLAYBOOK.length).toBeGreaterThan(0);
		const categories = FAILURE_PLAYBOOK.map((e) => e.category);
		expect(categories).toContain("Type Error");
		expect(categories).toContain("Module Not Found");
		expect(categories).toContain("Syntax Error");
		expect(categories).toContain("File Not Found");
		expect(categories).toContain("Permission Error");
		expect(categories).toContain("Test Failure");
		expect(categories).toContain("Build Failure");
		expect(categories).toContain("Lint Error");
	});

	it("all entries have pattern, category, and suggestion", () => {
		for (const entry of FAILURE_PLAYBOOK) {
			expect(entry.pattern).toBeInstanceOf(RegExp);
			expect(typeof entry.category).toBe("string");
			expect(typeof entry.suggestion).toBe("string");
			expect(entry.category.length).toBeGreaterThan(0);
			expect(entry.suggestion.length).toBeGreaterThan(0);
		}
	});
});

describe("findPlaybookEntries", () => {
	it("matches type errors", () => {
		const entries = findPlaybookEntries("TS2322: Type 'string' is not assignable");
		expect(entries.length).toBeGreaterThan(0);
		expect(entries.some((e) => e.category === "Type Error")).toBe(true);
	});

	it("matches 'type error' text", () => {
		const entries = findPlaybookEntries("type error on line 42");
		expect(entries.some((e) => e.category === "Type Error")).toBe(true);
	});

	it("matches module not found errors", () => {
		const entries = findPlaybookEntries("Cannot find module './missing'");
		expect(entries.some((e) => e.category === "Module Not Found")).toBe(true);
	});

	it("matches syntax errors", () => {
		const entries = findPlaybookEntries("SyntaxError: Unexpected token }");
		expect(entries.some((e) => e.category === "Syntax Error")).toBe(true);
	});

	it("matches ENOENT errors", () => {
		const entries = findPlaybookEntries("ENOENT: no such file or directory");
		expect(entries.length).toBeGreaterThan(0);
		const categories = entries.map((e) => e.category);
		expect(categories).toContain("File Not Found");
	});

	it("matches permission errors", () => {
		const entries = findPlaybookEntries("EACCES: permission denied");
		expect(entries.some((e) => e.category === "Permission Error")).toBe(true);
	});

	it("matches test failures", () => {
		const entries = findPlaybookEntries("test failed: expected 5 received 3");
		expect(entries.some((e) => e.category === "Test Failure")).toBe(true);
	});

	it("matches build failures", () => {
		const entries = findPlaybookEntries("build failed with 3 errors");
		expect(entries.some((e) => e.category === "Build Failure")).toBe(true);
	});

	it("matches lint errors", () => {
		const entries = findPlaybookEntries("biome check found 2 lint errors");
		expect(entries.some((e) => e.category === "Lint Error")).toBe(true);
	});

	it("returns empty for clean output", () => {
		const entries = findPlaybookEntries("All 42 tests passed. Build successful.");
		expect(entries).toHaveLength(0);
	});

	it("can return multiple matching entries", () => {
		// This matches both "syntax error" and "build failed"
		const entries = findPlaybookEntries("build failed due to syntax error");
		expect(entries.length).toBeGreaterThanOrEqual(2);
	});
});

describe("formatPlaybookAdvice", () => {
	it("returns empty string for empty entries", () => {
		expect(formatPlaybookAdvice([])).toBe("");
	});

	it("wraps output in XML tags", () => {
		const entries = [FAILURE_PLAYBOOK[0]];
		const result = formatPlaybookAdvice(entries);
		expect(result).toContain("<failure-recovery-guide>");
		expect(result).toContain("</failure-recovery-guide>");
	});

	it("includes category and suggestion", () => {
		const entries = findPlaybookEntries("TS2322: type error");
		const result = formatPlaybookAdvice(entries);
		expect(result).toContain("[Type Error]:");
		expect(result).toContain("Do NOT use `as any`");
	});

	it("includes critical warning", () => {
		const entries = [FAILURE_PLAYBOOK[0]];
		const result = formatPlaybookAdvice(entries);
		expect(result).toContain("CRITICAL");
		expect(result).toContain("root cause");
	});

	it("includes multiple entries", () => {
		const entries = findPlaybookEntries("build failed due to syntax error");
		const result = formatPlaybookAdvice(entries);
		expect(result).toContain("[Syntax Error]:");
		expect(result).toContain("[Build Failure]:");
	});
});
