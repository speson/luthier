import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LuthierConfigSchema } from "../config/schema.js";
import { loadSkills } from "./skill-loader.js";

describe("loadSkills", () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), "luthier-skills-test-"));
		spyOn(console, "log").mockImplementation(() => {});
	});

	afterEach(() => {
		rmSync(tempDir, { recursive: true, force: true });
	});

	function createSkillFile(dir: string, filename: string, content: string) {
		mkdirSync(dir, { recursive: true });
		writeFileSync(join(dir, filename), content);
	}


	/** Disable all bundled skills so file-loading tests check exact counts. */
	const NO_BUILTINS = {
		modules: {
			skills: {
				builtin: { playwright: false, "git-master": false, "frontend-ui-ux": false, "dev-browser": false },
			},
		},
	};

	it("returns empty map when skill directory does not exist", () => {
		const config = LuthierConfigSchema.parse(NO_BUILTINS);
		const skills = loadSkills(config, tempDir);
		expect(skills.size).toBe(0);
	});

	it("loads a skill with full frontmatter", () => {
		const skillDir = join(tempDir, ".opencode", "luthier", "skills");
		createSkillFile(
			skillDir,
			"git-master.md",
			`---
name: git-master
description: Git operations specialist
triggers:
  - commit
  - rebase
---

You are a git expert.`,
		);

		const config = LuthierConfigSchema.parse(NO_BUILTINS);
		const skills = loadSkills(config, tempDir);
		expect(skills.size).toBe(1);

		const skill = skills.get("git-master");
		expect(skill).toBeDefined();
		expect(skill?.name).toBe("git-master");
		expect(skill?.description).toBe("Git operations specialist");
		expect(skill?.triggers).toEqual(["commit", "rebase"]);
		expect(skill?.body).toBe("You are a git expert.");
	});

	it("falls back to filename when frontmatter has no name", () => {
		const skillDir = join(tempDir, ".opencode", "luthier", "skills");
		createSkillFile(
			skillDir,
			"my-skill.md",
			`---
description: A skill without a name field
---

Skill body here.`,
		);

		const config = LuthierConfigSchema.parse({});
		const skills = loadSkills(config, tempDir);
		const skill = skills.get("my-skill");
		expect(skill).toBeDefined();
		expect(skill?.name).toBe("my-skill");
	});

	it("handles file without frontmatter", () => {
		const skillDir = join(tempDir, ".opencode", "luthier", "skills");
		createSkillFile(skillDir, "plain.md", "Just a plain markdown file.");

		const config = LuthierConfigSchema.parse({});
		const skills = loadSkills(config, tempDir);
		const skill = skills.get("plain");
		expect(skill).toBeDefined();
		expect(skill?.name).toBe("plain");
		expect(skill?.body).toBe("Just a plain markdown file.");
		expect(skill?.triggers).toEqual([]);
	});

	it("discovers files in nested directories", () => {
		const baseDir = join(tempDir, ".opencode", "luthier", "skills");
		createSkillFile(join(baseDir, "git"), "commit.md", "---\nname: git-commit\n---\nCommit skill.");
		createSkillFile(join(baseDir, "web"), "search.md", "---\nname: web-search\n---\nSearch skill.");

		const config = LuthierConfigSchema.parse(NO_BUILTINS);
		const skills = loadSkills(config, tempDir);
		expect(skills.size).toBe(2);
		expect(skills.has("git-commit")).toBe(true);
		expect(skills.has("web-search")).toBe(true);
	});

	it("filters out disabled skills", () => {
		const skillDir = join(tempDir, ".opencode", "luthier", "skills");
		createSkillFile(skillDir, "a.md", "---\nname: skill-a\n---\nSkill A.");
		createSkillFile(skillDir, "b.md", "---\nname: skill-b\n---\nSkill B.");

		const config = LuthierConfigSchema.parse({
			...NO_BUILTINS,
			skills: { disabled: ["skill-b"] },
		});
		const skills = loadSkills(config, tempDir);
		expect(skills.size).toBe(1);
		expect(skills.has("skill-a")).toBe(true);
		expect(skills.has("skill-b")).toBe(false);
	});

	it("searches extra directories", () => {
		const extraDir = join(tempDir, "extra-skills");
		createSkillFile(extraDir, "extra.md", "---\nname: extra-skill\n---\nExtra.");

		const config = LuthierConfigSchema.parse({
			skills: { extra_directories: [extraDir] },
		});
		const skills = loadSkills(config, tempDir);
		expect(skills.has("extra-skill")).toBe(true);
	});

	it("later directories override earlier ones for duplicate names", () => {
		const primaryDir = join(tempDir, ".opencode", "luthier", "skills");
		createSkillFile(primaryDir, "dup.md", "---\nname: dup\n---\nPrimary version.");

		const extraDir = join(tempDir, "extra");
		createSkillFile(extraDir, "dup.md", "---\nname: dup\n---\nExtra version.");

		const config = LuthierConfigSchema.parse({
			skills: { extra_directories: [extraDir] },
		});
		const skills = loadSkills(config, tempDir);
		expect(skills.get("dup")?.body).toBe("Extra version.");
	});

	it("ignores non-md files", () => {
		const skillDir = join(tempDir, ".opencode", "luthier", "skills");
		createSkillFile(skillDir, "valid.md", "---\nname: valid\n---\nValid.");
		createSkillFile(skillDir, "readme.txt", "Not a skill.");
		createSkillFile(skillDir, "data.json", "{}");

		const config = LuthierConfigSchema.parse(NO_BUILTINS);
		const skills = loadSkills(config, tempDir);
		expect(skills.size).toBe(1);
		expect(skills.has("valid")).toBe(true);
	});

	it("uses custom skill directory from config", () => {
		const customDir = join(tempDir, "my-skills");
		createSkillFile(customDir, "custom.md", "---\nname: custom\n---\nCustom skill.");

		const config = LuthierConfigSchema.parse({
			skills: { directory: "my-skills" },
		});
		const skills = loadSkills(config, tempDir);
		expect(skills.has("custom")).toBe(true);
	});
});
