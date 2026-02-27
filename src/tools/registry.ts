import type { Hooks, PluginInput, ToolDefinition } from "@opencode-ai/plugin";
import type { LuthierConfig } from "../config/schema.js";
import { log, logVerbose } from "../shared/log.js";
import { createSessionTool } from "./session.js";
import { createWebSearchTool } from "./web-search.js";
import { createLuthierConfigTool } from "./luthier-config.js";

/**
 * A named tool entry for the registry.
 */
interface ToolEntry {
	/** Tool name — used for enable/disable matching. */
	name: string;
	/** Factory that produces the ToolDefinition. Returns undefined to skip. */
	create: (config: LuthierConfig, ctx: PluginInput) => ToolDefinition | undefined;
}

/**
 * All built-in tools. Each entry defines a name and a factory.
 * To add a new built-in tool: append an entry here.
 */
function getBuiltinTools(): ToolEntry[] {
	return [
		{
			name: "web-search",
			create: (config) => createWebSearchTool(config),
		},
		{
			name: "session-info",
			create: (_config, ctx) => createSessionTool(ctx),
		},
		{
			name: "luthier-config",
			create: (config, ctx) => createLuthierConfigTool(config, ctx),
		},
	];
}

/**
 * Check if a tool is allowed by the enable/disable config.
 *
 * Logic:
 *   - If `enabled` is set, only tools in the list are allowed (whitelist mode)
 *   - If `disabled` is set, tools in the list are blocked (blacklist mode)
 *   - If both are set, `enabled` takes precedence (whitelist wins)
 *   - If neither is set, all tools are allowed
 */
function isToolAllowed(name: string, config: LuthierConfig): boolean {
	const { enabled, disabled } = config.tools;

	// Whitelist mode — only explicitly enabled tools
	if (enabled && enabled.length > 0) {
		return enabled.includes(name);
	}

	// Blacklist mode — all except explicitly disabled tools
	if (disabled && disabled.length > 0) {
		return !disabled.includes(name);
	}

	// Default — all tools allowed
	return true;
}

/**
 * Build the tool map for the Hooks return object.
 *
 * Collects all built-in tools, filters by config, and returns
 * a `{ [toolName]: ToolDefinition }` map.
 */
export function buildTools(config: LuthierConfig, ctx: PluginInput): Hooks["tool"] {
	const entries = getBuiltinTools();
	const tools: Record<string, ToolDefinition> = {};

	let enabledCount = 0;
	let skippedCount = 0;

	for (const entry of entries) {
		if (!isToolAllowed(entry.name, config)) {
			logVerbose(`Tool disabled by config: ${entry.name}`);
			skippedCount++;
			continue;
		}

		const definition = entry.create(config, ctx);
		if (definition) {
			tools[entry.name] = definition;
			enabledCount++;
			logVerbose(`Tool registered: ${entry.name}`);
		}
	}

	if (enabledCount > 0) {
		log(`Tools: ${enabledCount} registered, ${skippedCount} skipped`);
	}

	return Object.keys(tools).length > 0 ? tools : undefined;
}
