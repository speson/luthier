import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, extname, join } from "node:path";
import type { PluginInput } from "@opencode-ai/plugin";
import type { LuthierConfig } from "../config/schema.js";
import { log, logVerbose } from "../shared/log.js";
import type { PromptModule } from "./types.js";

/**
 * Metadata parsed from a custom module's YAML frontmatter.
 */
export interface CustomModuleMeta {
	/** Unique module name (from frontmatter or filename). */
	name: string;
	/** Short description of what this module does. */
	description: string;
	/** Sort priority — lower values are injected earlier. Built-in modules use 10–50. */
	priority: number;
	/** Whether this module is enabled (can be overridden by config.modules.custom.disabled). */
	enabled: boolean;
}

/**
 * A loaded custom prompt module.
 */
export interface CustomModule {
	meta: CustomModuleMeta;
	/** Raw template body (markdown content after frontmatter). */
	body: string;
	/** File path this module was loaded from. */
	sourcePath: string;
}

/**
 * Parse simple YAML frontmatter from a markdown file.
 * Reuses the same lightweight parser pattern as skill-loader.
 */
function parseFrontmatter(content: string): { meta: Record<string, unknown>; body: string } {
	const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
	if (!match) {
		return { meta: {}, body: content };
	}

	const [, yamlBlock, body] = match;
	const meta: Record<string, unknown> = {};

	for (const line of yamlBlock.split("\n")) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;

		const colonIndex = trimmed.indexOf(":");
		if (colonIndex > 0) {
			const key = trimmed.slice(0, colonIndex).trim();
			const value = trimmed.slice(colonIndex + 1).trim();
			if (value === "true") meta[key] = true;
			else if (value === "false") meta[key] = false;
			else if (/^\d+$/.test(value)) meta[key] = Number.parseInt(value, 10);
			else meta[key] = value;
		}
	}

	return { meta, body: body.trim() };
}

/**
 * Convert parsed frontmatter + body into a CustomModule.
 */
function toCustomModule(filePath: string, content: string): CustomModule {
	const { meta, body } = parseFrontmatter(content);
	const nameFromFile = basename(filePath, extname(filePath));

	return {
		meta: {
			name: typeof meta.name === "string" ? meta.name : nameFromFile,
			description: typeof meta.description === "string" ? meta.description : "",
			priority: typeof meta.priority === "number" ? meta.priority : 100,
			enabled: typeof meta.enabled === "boolean" ? meta.enabled : true,
		},
		body,
		sourcePath: filePath,
	};
}

/**
 * Recursively discover all .md files in a directory.
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
 * Load all custom prompt modules from configured directories.
 *
 * Loading order:
 *   1. Primary directory: modules.custom.directory (relative to project root)
 *   2. Extra directories: modules.custom.extra_directories
 *
 * Modules with duplicate names: later directories override earlier ones.
 * Disabled modules (via config.modules.custom.disabled or frontmatter enabled: false) are excluded.
 *
 * Returns modules sorted by priority (lower = earlier injection).
 */
export function loadCustomModules(config: LuthierConfig, projectDirectory: string): CustomModule[] {
	const customConfig = config.modules.custom;
	const disabledSet = new Set(customConfig.disabled);
	const moduleMap = new Map<string, CustomModule>();

	// Collect all directories
	const dirs: string[] = [
		join(projectDirectory, customConfig.directory),
		...customConfig.extra_directories.map((d) => (d.startsWith("/") ? d : join(projectDirectory, d))),
	];

	let totalFiles = 0;

	for (const dir of dirs) {
		const files = discoverMarkdownFiles(dir);
		totalFiles += files.length;

		for (const filePath of files) {
			try {
				const content = readFileSync(filePath, "utf-8");
				const mod = toCustomModule(filePath, content);

				// Skip disabled modules
				if (!mod.meta.enabled) {
					logVerbose(`Custom module disabled (frontmatter): ${mod.meta.name} (${filePath})`);
					continue;
				}
				if (disabledSet.has(mod.meta.name)) {
					logVerbose(`Custom module disabled (config): ${mod.meta.name} (${filePath})`);
					continue;
				}

				moduleMap.set(mod.meta.name, mod);
				logVerbose(`Custom module loaded: ${mod.meta.name} (priority=${mod.meta.priority}, ${filePath})`);
			} catch (err) {
				logVerbose(`Failed to load custom module: ${filePath} — ${err}`);
			}
		}
	}

	const modules = [...moduleMap.values()].sort((a, b) => a.meta.priority - b.meta.priority);

	if (modules.length > 0) {
		log(`Custom modules: ${modules.length} loaded, ${disabledSet.size} disabled`);
	} else if (totalFiles > 0) {
		logVerbose(`Custom modules: ${totalFiles} files found but all disabled`);
	}

	return modules;
}

/**
 * Convert a CustomModule into a PromptModule.
 * The body is returned as-is — template rendering is handled by the assembler.
 */
export function toPromptModule(mod: CustomModule): PromptModule {
	return {
		name: mod.meta.name,
		getPromptFragments(): string[] {
			if (mod.body.length === 0) return [];
			return [mod.body];
		},
	};
}
