import { describe, expect, it } from "bun:test";
import { DEFAULT_CONFIG, LuthierConfigSchema } from "./schema.js";

describe("LuthierConfigSchema", () => {
	it("parses empty object with all defaults", () => {
		const result = LuthierConfigSchema.parse({});
		expect(result.disabled_hooks).toEqual([]);
		expect(result.hooks).toBeDefined();
		expect(result.agents).toEqual({});
		expect(result.categories).toEqual({});
		expect(result.tools).toBeDefined();
		expect(result.mcp).toBeDefined();
		expect(result.tui).toBeDefined();
		expect(result.notifications).toBeDefined();
		expect(result.session_tracking).toBeDefined();
		expect(result.experimental).toEqual({});
	});

	it("returns correct hook defaults", () => {
		const result = LuthierConfigSchema.parse({});
		expect(result.hooks["permission-handler"].auto_allow).toEqual([]);
		expect(result.hooks["permission-handler"].auto_deny).toEqual([]);
		expect(result.hooks["chat-message"].inject_context).toBe(false);
		expect(result.hooks["chat-message"].system_directives).toEqual([]);
		expect(result.hooks["tool-interceptor"].max_output_length).toBe(0);
		expect(result.hooks["tool-interceptor"].truncation_exempt).toEqual([]);
		expect(result.hooks["tool-interceptor"].blocked_tools).toEqual([]);
		expect(result.hooks["shell-env"].vars).toEqual({});
		expect(result.hooks["shell-env"].forward).toEqual([]);
		expect(result.hooks.compaction.context).toEqual([]);
		expect(result.hooks.compaction.prompt).toBeUndefined();
	});

	it("returns correct tool defaults", () => {
		const result = LuthierConfigSchema.parse({});
		expect(result.tools.enabled).toBeUndefined();
		expect(result.tools.disabled).toBeUndefined();
		expect(result.tools.web_search.provider).toBe("exa");
		expect(result.tools.web_search.api_key_env).toBe("EXA_API_KEY");
		expect(result.tools.web_search.max_results).toBe(5);
	});

	it("returns correct MCP defaults", () => {
		const result = LuthierConfigSchema.parse({});
		expect(result.mcp.custom).toEqual([]);
	});

	it("returns correct TUI defaults", () => {
		const result = LuthierConfigSchema.parse({});
		expect(result.tui.toast.enabled).toBe(true);
		expect(result.tui.toast.duration).toBe(3000);
		expect(result.tui.theme.prefix).toBe("[luthier]");
		expect(result.tui.theme.colors.success).toBe("green");
		expect(result.tui.theme.colors.warning).toBe("yellow");
		expect(result.tui.theme.colors.error).toBe("red");
		expect(result.tui.theme.colors.info).toBe("blue");
	});

	it("returns correct notification defaults", () => {
		const result = LuthierConfigSchema.parse({});
		expect(result.notifications.on_complete).toBe(false);
		expect(result.notifications.on_error).toBe(false);
		expect(result.notifications.channels).toEqual([]);
	});

	it("returns correct session tracking defaults", () => {
		const result = LuthierConfigSchema.parse({});
		expect(result.session_tracking.enabled).toBe(true);
		expect(result.session_tracking.logLevel).toBe("minimal");
	});

	it("parses partial config with overrides", () => {
		const result = LuthierConfigSchema.parse({
			disabled_hooks: ["event-tracker", "shell-env"],
			hooks: {
				"chat-message": {
					inject_context: true,
					system_directives: ["Always respond in Korean"],
				},
			},
		});
		expect(result.disabled_hooks).toEqual(["event-tracker", "shell-env"]);
		expect(result.hooks["chat-message"].inject_context).toBe(true);
		expect(result.hooks["chat-message"].system_directives).toEqual(["Always respond in Korean"]);
		// Other hooks should still have defaults
		expect(result.hooks["permission-handler"].auto_allow).toEqual([]);
	});

	it("parses agent overrides", () => {
		const result = LuthierConfigSchema.parse({
			agents: {
				oracle: {
					model: "claude-sonnet-4-20250514",
					temperature: 0.3,
					systemPrompt: "You are an architect.",
				},
			},
		});
		expect(result.agents.oracle).toBeDefined();
		expect(result.agents.oracle.model).toBe("claude-sonnet-4-20250514");
		expect(result.agents.oracle.temperature).toBe(0.3);
		expect(result.agents.oracle.systemPrompt).toBe("You are an architect.");
	});

	it("rejects invalid temperature (out of range)", () => {
		const result = LuthierConfigSchema.safeParse({
			agents: { oracle: { temperature: 5 } },
		});
		expect(result.success).toBe(false);
	});

	it("rejects invalid web search provider", () => {
		const result = LuthierConfigSchema.safeParse({
			tools: { web_search: { provider: "google" } },
		});
		expect(result.success).toBe(false);
	});

	it("rejects invalid session tracking log level", () => {
		const result = LuthierConfigSchema.safeParse({
			session_tracking: { logLevel: "debug" },
		});
		expect(result.success).toBe(false);
	});

	it("rejects invalid notification channel type", () => {
		const result = LuthierConfigSchema.safeParse({
			notifications: {
				channels: [{ type: "email", webhook: "https://example.com" }],
			},
		});
		expect(result.success).toBe(false);
	});

	it("parses custom MCP servers", () => {
		const result = LuthierConfigSchema.parse({
			mcp: {
				custom: [
					{
						name: "my-server",
						type: "remote",
						url: "https://example.com",
					},
				],
			},
		});
		expect(result.mcp.custom).toHaveLength(1);
		expect(result.mcp.custom[0].name).toBe("my-server");
		expect(result.mcp.custom[0].type).toBe("remote");
		expect(result.mcp.custom[0].enabled).toBe(true);
	});

	it("parses custom categories", () => {
		const result = LuthierConfigSchema.parse({
			categories: {
				"my-category": {
					model: "gpt-4o",
					description: "Custom category",
					temperature: 0.5,
				},
			},
		});
		expect(result.categories["my-category"]).toBeDefined();
		expect(result.categories["my-category"].model).toBe("gpt-4o");
	});

	it("parses skills config", () => {
		const result = LuthierConfigSchema.parse({
			skills: {
				directory: "custom/skills",
				disabled: ["playwright"],
				extra_directories: ["/usr/share/skills"],
			},
		});
		expect(result.skills.directory).toBe("custom/skills");
		expect(result.skills.disabled).toEqual(["playwright"]);
		expect(result.skills.extra_directories).toEqual(["/usr/share/skills"]);
	});
});

describe("DEFAULT_CONFIG", () => {
	it("is a valid parsed config", () => {
		expect(DEFAULT_CONFIG).toBeDefined();
		expect(DEFAULT_CONFIG.disabled_hooks).toEqual([]);
		expect(DEFAULT_CONFIG.hooks).toBeDefined();
		expect(DEFAULT_CONFIG.session_tracking.enabled).toBe(true);
	});

	it("equals parsing an empty object", () => {
		const parsed = LuthierConfigSchema.parse({});
		expect(DEFAULT_CONFIG).toEqual(parsed);
	});
});
