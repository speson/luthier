/**
 * Bundled MCP server definitions.
 *
 * These are pre-configured servers that luthier ships with.
 * Users can enable/disable them via config without manual setup.
 *
 * Each entry matches the OpenCode Config MCP format:
 *   - McpRemoteConfig (type: "remote") for cloud servers
 *   - McpLocalConfig (type: "local") for local processes
 */

export interface BundledMcpServer {
	/** Display name for logging. */
	name: string;
	/** OpenCode MCP config entry (McpLocalConfig | McpRemoteConfig shape). */
	config: {
		type: "remote" | "local";
		url?: string;
		command?: string[];
		enabled?: boolean;
		environment?: Record<string, string>;
		headers?: Record<string, string>;
		timeout?: number;
	};
}

/**
 * All bundled MCP servers.
 *
 * The key is the server name used in OpenCode's `mcp` config map.
 */
export const BUNDLED_MCP_SERVERS: Record<string, BundledMcpServer> = {};
