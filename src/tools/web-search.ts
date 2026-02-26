import { type ToolDefinition, tool } from "@opencode-ai/plugin";
import type { LuthierConfig } from "../config/schema.js";
import { logVerbose } from "../shared/log.js";

/**
 * Creates a web search tool that queries Exa or Tavily API.
 *
 * The tool uses the configured provider and API key from env vars.
 * API key is read from the env var name specified in config (not hardcoded).
 *
 * Returns undefined if no API key is available in the environment.
 */
export function createWebSearchTool(config: LuthierConfig): ToolDefinition | undefined {
	const searchConfig = config.tools.web_search;
	const apiKey = process.env[searchConfig.api_key_env];

	if (!apiKey) {
		logVerbose(`Web search disabled: ${searchConfig.api_key_env} not set in environment`);
		return undefined;
	}

	return tool({
		description: `Search the web using ${searchConfig.provider}. Returns relevant results for any query. Use when you need current information, documentation, or external references.`,
		args: {
			query: tool.schema.string().describe("Search query"),
			max_results: tool.schema.number().optional().describe("Maximum number of results (default: from config)"),
		},
		async execute(args, context) {
			context.metadata({ title: `Searching: ${args.query}` });

			const maxResults = args.max_results ?? searchConfig.max_results;

			try {
				if (searchConfig.provider === "exa") {
					return await searchExa(args.query, maxResults, apiKey);
				}
				return await searchTavily(args.query, maxResults, apiKey);
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err);
				return `Search failed: ${msg}`;
			}
		},
	});
}

/**
 * Search using Exa API (https://docs.exa.ai)
 */
async function searchExa(query: string, maxResults: number, apiKey: string): Promise<string> {
	const response = await fetch("https://api.exa.ai/search", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-api-key": apiKey,
		},
		body: JSON.stringify({
			query,
			numResults: maxResults,
			type: "auto",
			contents: {
				text: { maxCharacters: 2000 },
			},
		}),
	});

	if (!response.ok) {
		throw new Error(`Exa API error: ${response.status} ${response.statusText}`);
	}

	const data = (await response.json()) as ExaResponse;
	return formatResults(data.results ?? []);
}

/**
 * Search using Tavily API (https://docs.tavily.com)
 */
async function searchTavily(query: string, maxResults: number, apiKey: string): Promise<string> {
	const response = await fetch("https://api.tavily.com/search", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			api_key: apiKey,
			query,
			max_results: maxResults,
			include_raw_content: false,
		}),
	});

	if (!response.ok) {
		throw new Error(`Tavily API error: ${response.status} ${response.statusText}`);
	}

	const data = (await response.json()) as TavilyResponse;
	return formatResults(
		(data.results ?? []).map((r) => ({
			title: r.title,
			url: r.url,
			text: r.content,
		})),
	);
}

/**
 * Format search results into a readable string for the agent.
 */
function formatResults(results: Array<{ title?: string; url?: string; text?: string }>): string {
	if (results.length === 0) {
		return "No results found.";
	}

	return results
		.map((r, i) => {
			const title = r.title ?? "Untitled";
			const url = r.url ?? "";
			const text = r.text ?? "";
			return `[${i + 1}] ${title}\n    ${url}\n    ${text.slice(0, 500)}`;
		})
		.join("\n\n");
}

// ─── API response types (minimal) ───

interface ExaResponse {
	results?: Array<{
		title?: string;
		url?: string;
		text?: string;
	}>;
}

interface TavilyResponse {
	results?: Array<{
		title?: string;
		url?: string;
		content?: string;
	}>;
}
