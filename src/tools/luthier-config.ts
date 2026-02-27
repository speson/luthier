import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { type PluginInput, type ToolDefinition, tool } from "@opencode-ai/plugin";
import { parse as parseJsonc } from "jsonc-parser";
import type { LuthierConfig } from "../config/schema.js";
import { logVerbose } from "../shared/log.js";


function getByPath(obj: unknown, path: string): unknown {
	const keys = path.split(".");
	let current: unknown = obj;
	for (const key of keys) {
		if (current === null || current === undefined || typeof current !== "object") {
			return undefined;
		}
		current = (current as Record<string, unknown>)[key];
	}
	return current;
}


function setByPath(obj: Record<string, unknown>, path: string, value: unknown): void {
	const keys = path.split(".");
	let current: Record<string, unknown> = obj;
	for (let i = 0; i < keys.length - 1; i++) {
		const key = keys[i];
		if (current[key] === undefined || current[key] === null || typeof current[key] !== "object") {
			current[key] = {};
		}
		current = current[key] as Record<string, unknown>;
	}
	current[keys[keys.length - 1]] = value;
}


function deleteByPath(obj: Record<string, unknown>, path: string): boolean {
	const keys = path.split(".");
	let current: Record<string, unknown> = obj;
	for (let i = 0; i < keys.length - 1; i++) {
		const key = keys[i];
		if (current[key] === undefined || typeof current[key] !== "object") {
			return false;
		}
		current = current[key] as Record<string, unknown>;
	}
	const lastKey = keys[keys.length - 1];
	if (lastKey in current) {
		delete current[lastKey];
		return true;
	}
	return false;
}


function formatSection(name: string, value: unknown, depth = 0): string {
	if (value === null || value === undefined) return "";
	if (typeof value !== "object") {
		return `${"  ".repeat(depth)}${name}: ${JSON.stringify(value)}`;
	}
	if (Array.isArray(value)) {
		if (value.length === 0) return `${"  ".repeat(depth)}${name}: []`;
		return `${"  ".repeat(depth)}${name}: ${JSON.stringify(value)}`;
	}
	const entries = Object.entries(value as Record<string, unknown>);
	if (entries.length === 0) return `${"  ".repeat(depth)}${name}: {}`;
	const lines = [`${"  ".repeat(depth)}${name}:`];
	for (const [k, v] of entries) {
		if (typeof v === "object" && v !== null && !Array.isArray(v)) {
			lines.push(formatSection(k, v, depth + 1));
		} else {
			lines.push(`${"  ".repeat(depth + 1)}${k}: ${JSON.stringify(v)}`);
		}
	}
	return lines.join("\n");
}

/**
 * Creates a luthier config management tool.
 *
 * Allows AI to list, get, set, and reset luthier configuration values
 * on behalf of the user. Writes to project-level config file.
 */
export function createLuthierConfigTool(config: LuthierConfig, ctx: PluginInput): ToolDefinition {
	return tool({
		description:
			"Manage luthier plugin configuration. List all settings, get/set specific values, or reset overrides. Changes are written to the project-level config file (.opencode/luthier.jsonc).",
		args: {
			action: tool.schema
				.enum(["list", "get", "set", "reset"])
				.describe("Action to perform: list all config, get a value, set a value, or reset to default"),
			key: tool.schema
				.string()
				.optional()
				.describe('Dot-notation config key (e.g. "hooks.chat-message.inject_context", "tools.web_search.provider")'),
			value: tool.schema
				.string()
				.optional()
				.describe('JSON value as string (e.g. "true", "5", "\\"exa\\"", "[\\"a\\",\\"b\\"]")'),
		},
		async execute(args, context) {
			context.metadata({ title: `Config: ${args.action}` });

			try {
				switch (args.action) {
					case "list": {
						const sections = [
							"disabled_hooks",
							"hooks",
							"agents",
							"categories",
							"skills",
							"tools",
							"mcp",
							"tui",
							"notifications",
							"session_tracking",
							"modules",
							"ux",
							"experimental",
						] as const;
						const lines: string[] = ["# Luthier Configuration\n"];
						for (const section of sections) {
							const value = config[section];
							lines.push(formatSection(section, value));
							lines.push("");
						}
						return lines.join("\n");
					}

					case "get": {
						if (!args.key) {
							return 'Error: "key" is required for the "get" action. Use dot-notation like "hooks.chat-message.inject_context".';
						}
						const value = getByPath(config, args.key);
						if (value === undefined) {
							return `No value found for key: ${args.key}`;
						}
						return JSON.stringify(value, null, 2);
					}

					case "set": {
						if (!args.key) {
							return 'Error: "key" is required for the "set" action.';
						}
						if (args.value === undefined) {
							return 'Error: "value" is required for the "set" action. Provide a JSON value as string.';
						}

						let parsedValue: unknown;
						try {
							parsedValue = JSON.parse(args.value);
						} catch {
							return `Error: Invalid JSON value: ${args.value}. Wrap strings in quotes, e.g. '"exa"'.`;
						}

						const configDir = join(ctx.directory, ".opencode");
						const configPath = join(configDir, "luthier.jsonc");


						let projectConfig: Record<string, unknown> = {};
						if (existsSync(configPath)) {
							try {
								const raw = readFileSync(configPath, "utf-8");
								projectConfig = (parseJsonc(raw) as Record<string, unknown>) ?? {};
							} catch {
								projectConfig = {};
							}
						}


						setByPath(projectConfig, args.key, parsedValue);


						mkdirSync(configDir, { recursive: true });
						writeFileSync(configPath, `${JSON.stringify(projectConfig, null, 2)}\n`, "utf-8");

						logVerbose(`Config set: ${args.key} = ${args.value}`);


						try {
							await ctx.client.app.log({
								body: {
									service: "luthier",
									level: "info",
									message: `[luthier] Config updated: ${args.key} = ${args.value}`,
								},
							});
						} catch {
							logVerbose("Toast failed (TUI may not be available)");
						}

						return `Config updated: ${args.key} = ${JSON.stringify(parsedValue)}\nWritten to: ${configPath}\n\nNote: Some changes may require restarting OpenCode to take effect.`;
					}

					case "reset": {
						if (!args.key) {
							return 'Error: "key" is required for the "reset" action.';
						}

						const configDir = join(ctx.directory, ".opencode");
						const configPath = join(configDir, "luthier.jsonc");

						if (!existsSync(configPath)) {
						return "No project config file found. Nothing to reset.";
						}

						let projectConfig: Record<string, unknown> = {};
						try {
							const raw = readFileSync(configPath, "utf-8");
							projectConfig = (parseJsonc(raw) as Record<string, unknown>) ?? {};
						} catch {
							return "Error: Failed to read project config file.";
						}

						const deleted = deleteByPath(projectConfig, args.key);
						if (!deleted) {
							return `Key not found in project config: ${args.key}. Nothing to reset.`;
						}

						writeFileSync(configPath, `${JSON.stringify(projectConfig, null, 2)}\n`, "utf-8");

						logVerbose(`Config reset: ${args.key}`);


						try {
							await ctx.client.app.log({
								body: {
									service: "luthier",
									level: "info",
									message: `[luthier] Config reset: ${args.key} (reverted to default)`,
								},
							});
						} catch {
							logVerbose("Toast failed (TUI may not be available)");
						}

						return `Config reset: ${args.key} removed from project config.\nThe default value will be used instead.\nWritten to: ${configPath}`;
					}

					default:
						return `Unknown action: ${args.action}`;
				}
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err);
				return `Error: ${msg}`;
			}
		},
	});
}
