import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, extname, join } from "node:path";
import type { LuthierConfig } from "../config/schema.js";
import { log, logVerbose } from "../shared/log.js";

/**
 * A loaded skill definition parsed from a Markdown file.
 *
 * Skill files are Markdown with YAML frontmatter:
 * ```markdown
 * ---
 * name: git-master
 * description: Git operations specialist
 * triggers:
 *   - commit
 *   - rebase
 *   - squash
 * ---
 *
 * # Git Master Skill
 *
 * You are an expert at git operations...
 * ```
 */
export interface Skill {
	/** Unique skill name (from frontmatter or filename). */
	name: string;
	/** Short description of the skill. */
	description: string;
	/** Keywords/phrases that trigger this skill's activation. */
	triggers: string[];
	/** The full markdown body — becomes the skill instruction prompt. */
	body: string;
	/** File path the skill was loaded from. */
	sourcePath: string;
}

/**
 * Parse YAML-like frontmatter from a Markdown file.
 *
 * We use a lightweight parser instead of a full YAML library
 * to keep dependencies minimal. Supports:
 *   - Simple key: value pairs
 *   - Array values (lines starting with "  - ")
 */
function parseFrontmatter(content: string): { meta: Record<string, unknown>; body: string } {
	const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
	if (!match) {
		return { meta: {}, body: content };
	}

	const [, yamlBlock, body] = match;
	const meta: Record<string, unknown> = {};
	let currentKey = "";

	for (const line of yamlBlock.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;

		// Array item: "  - value"
		if (trimmed.startsWith("- ") && currentKey) {
			const existing = meta[currentKey];
			const value = trimmed.slice(2).trim();
			if (Array.isArray(existing)) {
				existing.push(value);
			} else {
				meta[currentKey] = [value];
			}
			continue;
		}

		// Key: value pair
		const colonIndex = trimmed.indexOf(":");
		if (colonIndex > 0) {
			currentKey = trimmed.slice(0, colonIndex).trim();
			const value = trimmed.slice(colonIndex + 1).trim();
			if (value) {
				meta[currentKey] = value;
			} else {
				// Empty value — might be an array header
				meta[currentKey] = [];
			}
		}
	}

	return { meta, body: body.trim() };
}

/**
 * Convert parsed frontmatter into a Skill object.
 */
function toSkill(filePath: string, content: string): Skill {
	const { meta, body } = parseFrontmatter(content);

	const nameFromFile = basename(filePath, extname(filePath));

	const triggers = meta.triggers;
	const triggerArray = Array.isArray(triggers) ? (triggers as string[]) : [];

	return {
		name: typeof meta.name === "string" ? meta.name : nameFromFile,
		description: typeof meta.description === "string" ? meta.description : "",
		triggers: triggerArray,
		body,
		sourcePath: filePath,
	};
}

/**
 * Recursively discover all .md files in a directory (supports nested skill dirs).
 */
function discoverMarkdownFiles(dir: string): string[] {
	if (!existsSync(dir)) return [];

	const files: string[] = [];

	for (const entry of readdirSync(dir)) {
		const fullPath = join(dir, entry);
		const stat = statSync(fullPath);

		if (stat.isDirectory()) {
			files.push(...discoverMarkdownFiles(fullPath));
		} else if (entry.endsWith(".md")) {
			files.push(fullPath);
		}
	}

	return files;
}

/**
 * Load all skills from configured directories, respecting disabled list.
 *
 * Search order:
 *   1. Primary directory: `skills.directory` (relative to project root)
 *   2. Extra directories: `skills.extra_directories` (absolute or relative)
 *
 * Skills with duplicate names: later directories override earlier ones.
 */
export function loadSkills(config: LuthierConfig, projectDirectory: string): Map<string, Skill> {
	const skillsConfig = config.skills;
	const disabledSet = new Set(skillsConfig.disabled);
	const skills = new Map<string, Skill>();

	// Collect all directories to search
	const dirs: string[] = [
		join(projectDirectory, skillsConfig.directory),
		...skillsConfig.extra_directories.map((d) => (d.startsWith("/") ? d : join(projectDirectory, d))),
	];

	let totalFiles = 0;

	for (const dir of dirs) {
		const files = discoverMarkdownFiles(dir);
		totalFiles += files.length;

		for (const filePath of files) {
			try {
				const content = readFileSync(filePath, "utf-8");
				const skill = toSkill(filePath, content);

				if (disabledSet.has(skill.name)) {
					logVerbose(`Skill disabled: ${skill.name} (${filePath})`);
					continue;
				}

				skills.set(skill.name, skill);
				logVerbose(`Skill loaded: ${skill.name} (${filePath})`);
			} catch (err) {
				logVerbose(`Failed to load skill: ${filePath} — ${err}`);
			}
		}
	}

	if (totalFiles > 0) {
		log(`Skills: ${skills.size} loaded, ${disabledSet.size} disabled`);
	} else {
		logVerbose("No skill files found");
	}

	return skills;
}
