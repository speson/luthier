import { describe, expect, it } from "bun:test";
import { buildSkillPrompts, findRelevantSkills } from "./prompt-builder.js";
import type { Skill } from "./skill-loader.js";

function makeSkill(overrides: Partial<Skill> = {}): Skill {
	return {
		name: "test-skill",
		description: "A test skill",
		triggers: ["test", "check"],
		body: "You are a test expert.",
		sourcePath: "/tmp/test-skill.md",
		...overrides,
	};
}

function makeSkillMap(...skills: Skill[]): Map<string, Skill> {
	const map = new Map<string, Skill>();
	for (const skill of skills) {
		map.set(skill.name, skill);
	}
	return map;
}

describe("buildSkillPrompts", () => {
	it("returns empty array for empty skill map", () => {
		const result = buildSkillPrompts(new Map());
		expect(result).toEqual([]);
	});

	it("returns skill blocks with XML tags", () => {
		const skills = makeSkillMap(makeSkill());
		const result = buildSkillPrompts(skills);
		expect(result.length).toBeGreaterThan(0);
		const joined = result.join("\n");
		expect(joined).toContain('<skill name="test-skill">');
		expect(joined).toContain("</skill>");
		expect(joined).toContain("You are a test expert.");
	});

	it("includes skills summary section", () => {
		const skills = makeSkillMap(makeSkill(), makeSkill({ name: "git-master", description: "Git operations" }));
		const result = buildSkillPrompts(skills);
		const joined = result.join("\n");
		expect(joined).toContain("<available_skills>");
		expect(joined).toContain("</available_skills>");
		expect(joined).toContain("test-skill");
		expect(joined).toContain("git-master");
	});

	it("includes skill description in block header", () => {
		const skills = makeSkillMap(makeSkill({ description: "Expert testing" }));
		const result = buildSkillPrompts(skills);
		const joined = result.join("\n");
		expect(joined).toContain("(Skill) Expert testing");
	});

	it("includes triggers in skill block", () => {
		const skills = makeSkillMap(makeSkill({ triggers: ["commit", "rebase"] }));
		const result = buildSkillPrompts(skills);
		const joined = result.join("\n");
		expect(joined).toContain("Triggers: commit, rebase");
	});

	it("excludes skills with empty body", () => {
		const skills = makeSkillMap(makeSkill({ name: "empty-skill", body: "", description: "Empty" }));
		const result = buildSkillPrompts(skills);
		const joined = result.join("\n");
		// Summary should still include the skill
		expect(joined).toContain("empty-skill");
		// But no <skill> block for it
		expect(joined).not.toContain('<skill name="empty-skill">');
	});

	it("handles skill with no triggers", () => {
		const skills = makeSkillMap(makeSkill({ triggers: [] }));
		const result = buildSkillPrompts(skills);
		const joined = result.join("\n");
		expect(joined).not.toContain("Triggers:");
	});
});

describe("findRelevantSkills", () => {
	it("returns matching skills by trigger", () => {
		const skills = makeSkillMap(
			makeSkill({ name: "a", triggers: ["commit", "push"] }),
			makeSkill({ name: "b", triggers: ["test", "lint"] }),
		);
		const result = findRelevantSkills(skills, "I want to commit my changes");
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("a");
	});

	it("matches triggers case-insensitively", () => {
		const skills = makeSkillMap(makeSkill({ triggers: ["Commit"] }));
		const result = findRelevantSkills(skills, "please COMMIT this");
		expect(result).toHaveLength(1);
	});

	it("returns empty array when no triggers match", () => {
		const skills = makeSkillMap(makeSkill({ triggers: ["deploy"] }));
		const result = findRelevantSkills(skills, "refactor the code");
		expect(result).toHaveLength(0);
	});

	it("returns multiple matching skills", () => {
		const skills = makeSkillMap(
			makeSkill({ name: "a", triggers: ["test"] }),
			makeSkill({ name: "b", triggers: ["test"] }),
		);
		const result = findRelevantSkills(skills, "run the test");
		expect(result).toHaveLength(2);
	});

	it("returns empty for empty skill map", () => {
		const result = findRelevantSkills(new Map(), "anything");
		expect(result).toHaveLength(0);
	});
});
