import { describe, expect, it } from "bun:test";
import { BUNDLED_SKILLS } from "./bundled-skills.js";

describe("BUNDLED_SKILLS", () => {
	it("has exactly 4 skills", () => {
		expect(Object.keys(BUNDLED_SKILLS).length).toBe(4);
	});

	it("each skill has name, description, triggers, body", () => {
		for (const skill of Object.values(BUNDLED_SKILLS)) {
			expect(typeof skill.name).toBe("string");
			expect(skill.name.length).toBeGreaterThan(0);
			expect(typeof skill.description).toBe("string");
			expect(skill.description.length).toBeGreaterThan(0);
			expect(Array.isArray(skill.triggers)).toBe(true);
			expect(skill.triggers.length).toBeGreaterThan(0);
			expect(typeof skill.body).toBe("string");
			expect(skill.body.length).toBeGreaterThan(0);
		}
	});

	it("playwright skill has 'browser' in description or body", () => {
		const skill = BUNDLED_SKILLS.playwright;
		expect(skill).toBeDefined();
		const combined = (skill.description + skill.body).toLowerCase();
		expect(combined.includes("browser")).toBe(true);
	});

	it("git-master skill has 'commit' in triggers or body", () => {
		const skill = BUNDLED_SKILLS["git-master"];
		expect(skill).toBeDefined();
		const hasTrigger = skill.triggers.some((t) => t.toLowerCase().includes("commit"));
		const hasBody = skill.body.toLowerCase().includes("commit");
		expect(hasTrigger || hasBody).toBe(true);
	});

	it("frontend-ui-ux skill has 'responsive' or 'accessibility' in body", () => {
		const skill = BUNDLED_SKILLS["frontend-ui-ux"];
		expect(skill).toBeDefined();
		const body = skill.body.toLowerCase();
		expect(body.includes("responsive") || body.includes("accessibility")).toBe(true);
	});

	it("dev-browser skill has 'DevTools' or 'network' in body", () => {
		const skill = BUNDLED_SKILLS["dev-browser"];
		expect(skill).toBeDefined();
		const body = skill.body.toLowerCase();
		expect(body.includes("devtools") || body.includes("network")).toBe(true);
	});
});
