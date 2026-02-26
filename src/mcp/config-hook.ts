import type { Hooks } from "@opencode-ai/plugin";
import type { LuthierConfig } from "../config/schema.js";
import { log, logVerbose } from "../shared/log.js";
import { BUNDLED_MCP_SERVERS } from "./bundled.js";

/**
 * Creates a `config` hook that injects MCP server definitions
 * into OpenCode's configuration.
 *
 * This hook:
 *   1. Injects enabled bundled MCP servers (Context7, grep.app)
 *   2. Injects user-defined custom MCP servers from luthier config
 *   3. Won't override servers already defined in user's opencode config
 *
 * The config hook receives the OpenCode Config object and can mutate it.
 */
export function createMcpConfigHook(config: LuthierConfig): Hooks["config"] {
	const mcpConfig = config.mcp;

	// Resolve which bundled servers to inject
	const bundledToInject: Array<{ key: string; name: string; serverConfig: Record<string, unknown> }> = [];

	for (const [key, server] of Object.entries(BUNDLED_MCP_SERVERS)) {
		// Check if user has explicitly disabled this bundled server
		const userSetting = mcpConfig.bundled[key as keyof typeof mcpConfig.bundled];
		if (userSetting !== undefined && !userSetting.enabled) {
			logVerbose(`Bundled MCP server disabled: ${server.name}`);
			continue;
		}

		bundledToInject.push({
			key,
			name: server.name,
			serverConfig: server.config as Record<string, unknown>,
		});
	}

	// Resolve custom servers
	const customServers = mcpConfig.custom;

	const hasAnything = bundledToInject.length > 0 || customServers.length > 0;
	if (!hasAnything) {
		return undefined;
	}

	return async (input) => {
		// Ensure mcp map exists
		if (!input.mcp) {
			input.mcp = {};
		}

		let injectedCount = 0;

		// Inject bundled servers (skip if already defined by user)
		for (const { key, name, serverConfig } of bundledToInject) {
			if (input.mcp[key]) {
				logVerbose(`MCP server already defined, skipping: ${name}`);
				continue;
			}
			// biome-ignore lint/suspicious/noExplicitAny: OpenCode Config mcp values are McpLocalConfig | McpRemoteConfig
			input.mcp[key] = serverConfig as any;
			injectedCount++;
			logVerbose(`MCP server injected: ${name}`);
		}

		// Inject custom servers
		for (const custom of customServers) {
			if (input.mcp[custom.name]) {
				logVerbose(`MCP server already defined, skipping custom: ${custom.name}`);
				continue;
			}

			if (custom.type === "remote" && custom.url) {
				input.mcp[custom.name] = {
					type: "remote",
					url: custom.url,
					enabled: custom.enabled !== false,
					...(custom.headers ? { headers: custom.headers } : {}),
					// biome-ignore lint/suspicious/noExplicitAny: OpenCode Config mcp union type requires cast
				} as any;
			} else if (custom.type === "local" && custom.command) {
				input.mcp[custom.name] = {
					type: "local",
					command: custom.command,
					enabled: custom.enabled !== false,
					...(custom.environment ? { environment: custom.environment } : {}),
					// biome-ignore lint/suspicious/noExplicitAny: OpenCode Config mcp union type requires cast
				} as any;
			}

			injectedCount++;
			logVerbose(`Custom MCP server injected: ${custom.name}`);
		}

		if (injectedCount > 0) {
			log(`MCP: ${injectedCount} server(s) injected`);
		}
	};
}
