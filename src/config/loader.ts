import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseJsonc } from "jsonc-parser";
import { log, logError, logVerbose } from "../shared/log.js";
import { DEFAULT_CONFIG, type LuthierConfig, LuthierConfigSchema } from "./schema.js";

const USER_CONFIG_DIR = join(process.env.HOME ?? process.env.USERPROFILE ?? "~", ".config", "opencode");
const USER_CONFIG_FILE = "luthier.jsonc";
const PROJECT_CONFIG_DIR = ".opencode";
const PROJECT_CONFIG_FILE = "luthier.jsonc";

/**
 * Read and parse a JSONC file. Returns undefined on failure.
 */
function readJsoncFile(filePath: string): Record<string, unknown> | undefined {
	if (!existsSync(filePath)) {
		logVerbose(`Config not found: ${filePath}`);
		return undefined;
	}

	try {
		const raw = readFileSync(filePath, "utf-8");
		const parsed = parseJsonc(raw);
		logVerbose(`Config loaded: ${filePath}`);
		return parsed as Record<string, unknown>;
	} catch (err) {
		logError(`Failed to parse config: ${filePath}`, err);
		return undefined;
	}
}

/**
 * Deep merge two objects. Source values override target values.
 * Arrays are replaced, not concatenated.
 */
function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
	const result = { ...target };

	for (const key of Object.keys(source)) {
		const sourceVal = source[key];
		const targetVal = target[key];

		if (
			sourceVal !== null &&
			typeof sourceVal === "object" &&
			!Array.isArray(sourceVal) &&
			targetVal !== null &&
			typeof targetVal === "object" &&
			!Array.isArray(targetVal)
		) {
			result[key] = deepMerge(targetVal as Record<string, unknown>, sourceVal as Record<string, unknown>);
		} else {
			result[key] = sourceVal;
		}
	}

	return result;
}

/**
 * Load luthier configuration from user-level and project-level files.
 * Project-level settings override user-level settings.
 * Returns validated config with defaults on missing/invalid files.
 */
export function loadLuthierConfig(projectDirectory: string): LuthierConfig {
	const userConfigPath = join(USER_CONFIG_DIR, USER_CONFIG_FILE);
	const projectConfigPath = join(projectDirectory, PROJECT_CONFIG_DIR, PROJECT_CONFIG_FILE);

	const userConfig = readJsoncFile(userConfigPath);
	const projectConfig = readJsoncFile(projectConfigPath);

	let merged: Record<string, unknown> = {};

	if (userConfig) {
		merged = { ...userConfig };
	}

	if (projectConfig) {
		merged = deepMerge(merged, projectConfig);
	}

	const result = LuthierConfigSchema.safeParse(merged);

	if (!result.success) {
		logError("Invalid config, using defaults:", result.error.format());
		return DEFAULT_CONFIG;
	}

	log("Config loaded successfully");
	return result.data;
}
