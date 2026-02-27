import { beforeEach, describe, expect, it, spyOn } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { PluginInput } from "@opencode-ai/plugin";
import { DEFAULT_CONFIG, LuthierConfigSchema } from "../config/schema.js";
import { createLuthierConfigTool } from "./luthier-config.js";

function makeMockCtx(directory: string): PluginInput {
	return {
		client: {
			app: { log: async () => ({}) },
		} as unknown as PluginInput["client"],
		project: {} as PluginInput["project"],
		directory,
		worktree: directory,
		serverUrl: new URL("http://localhost:3000"),
		$: {} as PluginInput["$"],
	};
}

function makeMockContext() {
	return {
		metadata: () => {},
		sessionID: "test-session",
		directory: "/tmp",
		ask: async () => ({ value: "" }),
	};
}

let tmpDir: string;
let mockCtx: PluginInput;

describe("luthier-config tool", () => {
	beforeEach(() => {
		spyOn(console, "log").mockImplementation(() => {});
		spyOn(console, "error").mockImplementation(() => {});
		tmpDir = mkdtempSync(join(tmpdir(), "luthier-config-test-"));
		mockCtx = makeMockCtx(tmpDir);
	});

	describe("list action", () => {
		it("returns formatted config overview", async () => {
			const toolDef = createLuthierConfigTool(DEFAULT_CONFIG, mockCtx);
			const result = await toolDef.execute({ action: "list" }, makeMockContext() as never);
			expect(result).toContain("Luthier Configuration");
			expect(result).toContain("disabled_hooks");
			expect(result).toContain("hooks");
			expect(result).toContain("tools");
			expect(result).toContain("modules");
		});

		it("includes custom config values when set", async () => {
			const config = LuthierConfigSchema.parse({
				hooks: { "chat-message": { system_directives: ["Be concise"] } },
			});
			const toolDef = createLuthierConfigTool(config, mockCtx);
			const result = await toolDef.execute({ action: "list" }, makeMockContext() as never);
			expect(result).toContain("Be concise");
		});
	});

	describe("get action", () => {
		it("returns error when key is missing", async () => {
			const toolDef = createLuthierConfigTool(DEFAULT_CONFIG, mockCtx);
			const result = await toolDef.execute({ action: "get" }, makeMockContext() as never);
			expect(result).toContain("Error");
			expect(result).toContain("key");
		});

		it("returns value for a valid top-level key", async () => {
			const toolDef = createLuthierConfigTool(DEFAULT_CONFIG, mockCtx);
			const result = await toolDef.execute({ action: "get", key: "disabled_hooks" }, makeMockContext() as never);
			expect(result).toBe("[]");
		});

		it("returns value for a nested key", async () => {
			const config = LuthierConfigSchema.parse({
				tools: { web_search: { provider: "tavily" } },
			});
			const toolDef = createLuthierConfigTool(config, mockCtx);
			const result = await toolDef.execute(
				{ action: "get", key: "tools.web_search.provider" },
				makeMockContext() as never,
			);
			expect(result).toBe('"tavily"');
		});

		it("returns not-found message for nonexistent key", async () => {
			const toolDef = createLuthierConfigTool(DEFAULT_CONFIG, mockCtx);
			const result = await toolDef.execute({ action: "get", key: "nonexistent.deep.key" }, makeMockContext() as never);
			expect(result).toContain("No value found");
		});

		it("returns boolean values correctly", async () => {
			const toolDef = createLuthierConfigTool(DEFAULT_CONFIG, mockCtx);
			const result = await toolDef.execute(
				{ action: "get", key: "modules.templates_enabled" },
				makeMockContext() as never,
			);
			expect(result).toBe("true");
		});
	});

	describe("set action", () => {
		it("returns error when key is missing", async () => {
			const toolDef = createLuthierConfigTool(DEFAULT_CONFIG, mockCtx);
			const result = await toolDef.execute({ action: "set", value: "true" }, makeMockContext() as never);
			expect(result).toContain("Error");
			expect(result).toContain("key");
		});

		it("returns error when value is missing", async () => {
			const toolDef = createLuthierConfigTool(DEFAULT_CONFIG, mockCtx);
			const result = await toolDef.execute(
				{ action: "set", key: "hooks.chat-message.inject_context" },
				makeMockContext() as never,
			);
			expect(result).toContain("Error");
			expect(result).toContain("value");
		});

		it("returns error for invalid JSON value", async () => {
			const toolDef = createLuthierConfigTool(DEFAULT_CONFIG, mockCtx);
			const result = await toolDef.execute(
				{ action: "set", key: "some.key", value: "not-valid-json" },
				makeMockContext() as never,
			);
			expect(result).toContain("Error");
			expect(result).toContain("Invalid JSON");
		});

		it("creates .opencode dir and config file when they don't exist", async () => {
			const toolDef = createLuthierConfigTool(DEFAULT_CONFIG, mockCtx);
			const result = await toolDef.execute(
				{ action: "set", key: "hooks.chat-message.inject_context", value: "true" },
				makeMockContext() as never,
			);
			expect(result).toContain("Config updated");
			const configPath = join(tmpDir, ".opencode", "luthier.jsonc");
			expect(existsSync(configPath)).toBe(true);

			const written = JSON.parse(readFileSync(configPath, "utf-8"));
			expect(written.hooks["chat-message"].inject_context).toBe(true);
		});

		it("preserves existing config values when setting new ones", async () => {
			const opencodeDir = join(tmpDir, ".opencode");
			mkdirSync(opencodeDir, { recursive: true });
			writeFileSync(join(opencodeDir, "luthier.jsonc"), JSON.stringify({ disabled_hooks: ["toast"] }, null, 2));

			const toolDef = createLuthierConfigTool(DEFAULT_CONFIG, mockCtx);
			await toolDef.execute(
				{ action: "set", key: "tools.web_search.provider", value: '"tavily"' },
				makeMockContext() as never,
			);

			const written = JSON.parse(readFileSync(join(opencodeDir, "luthier.jsonc"), "utf-8"));
			expect(written.disabled_hooks).toEqual(["toast"]);
			expect(written.tools.web_search.provider).toBe("tavily");
		});

		it("handles array values", async () => {
			const toolDef = createLuthierConfigTool(DEFAULT_CONFIG, mockCtx);
			await toolDef.execute(
				{ action: "set", key: "disabled_hooks", value: '["toast","metrics-event"]' },
				makeMockContext() as never,
			);

			const configPath = join(tmpDir, ".opencode", "luthier.jsonc");
			const written = JSON.parse(readFileSync(configPath, "utf-8"));
			expect(written.disabled_hooks).toEqual(["toast", "metrics-event"]);
		});

		it("handles numeric values", async () => {
			const toolDef = createLuthierConfigTool(DEFAULT_CONFIG, mockCtx);
			await toolDef.execute(
				{ action: "set", key: "tools.web_search.max_results", value: "10" },
				makeMockContext() as never,
			);

			const configPath = join(tmpDir, ".opencode", "luthier.jsonc");
			const written = JSON.parse(readFileSync(configPath, "utf-8"));
			expect(written.tools.web_search.max_results).toBe(10);
		});

		it("overwrites existing value at same key", async () => {
			const toolDef = createLuthierConfigTool(DEFAULT_CONFIG, mockCtx);
			await toolDef.execute(
				{ action: "set", key: "tools.web_search.provider", value: '"exa"' },
				makeMockContext() as never,
			);
			await toolDef.execute(
				{ action: "set", key: "tools.web_search.provider", value: '"tavily"' },
				makeMockContext() as never,
			);

			const configPath = join(tmpDir, ".opencode", "luthier.jsonc");
			const written = JSON.parse(readFileSync(configPath, "utf-8"));
			expect(written.tools.web_search.provider).toBe("tavily");
		});

		it("calls toast notification on success", async () => {
			const logSpy = spyOn(mockCtx.client.app, "log").mockResolvedValue({} as never);
			const toolDef = createLuthierConfigTool(DEFAULT_CONFIG, mockCtx);
			await toolDef.execute({ action: "set", key: "disabled_hooks", value: "[]" }, makeMockContext() as never);
			expect(logSpy).toHaveBeenCalled();
		});
	});

	describe("reset action", () => {
		it("returns error when key is missing", async () => {
			const toolDef = createLuthierConfigTool(DEFAULT_CONFIG, mockCtx);
			const result = await toolDef.execute({ action: "reset" }, makeMockContext() as never);
			expect(result).toContain("Error");
			expect(result).toContain("key");
		});

		it("returns message when no project config exists", async () => {
			const toolDef = createLuthierConfigTool(DEFAULT_CONFIG, mockCtx);
			const result = await toolDef.execute({ action: "reset", key: "some.key" }, makeMockContext() as never);
			expect(result).toContain("No project config file found");
		});

		it("returns message when key doesn't exist in project config", async () => {
			const opencodeDir = join(tmpDir, ".opencode");
			mkdirSync(opencodeDir, { recursive: true });
			writeFileSync(join(opencodeDir, "luthier.jsonc"), "{}");

			const toolDef = createLuthierConfigTool(DEFAULT_CONFIG, mockCtx);
			const result = await toolDef.execute({ action: "reset", key: "nonexistent.key" }, makeMockContext() as never);
			expect(result).toContain("Key not found");
		});

		it("removes a top-level key from project config", async () => {
			const opencodeDir = join(tmpDir, ".opencode");
			mkdirSync(opencodeDir, { recursive: true });
			writeFileSync(
				join(opencodeDir, "luthier.jsonc"),
				JSON.stringify({ disabled_hooks: ["toast"], tools: {} }, null, 2),
			);

			const toolDef = createLuthierConfigTool(DEFAULT_CONFIG, mockCtx);
			const result = await toolDef.execute({ action: "reset", key: "disabled_hooks" }, makeMockContext() as never);
			expect(result).toContain("Config reset");

			const written = JSON.parse(readFileSync(join(opencodeDir, "luthier.jsonc"), "utf-8"));
			expect("disabled_hooks" in written).toBe(false);
			expect(written.tools).toBeDefined();
		});

		it("removes a nested key from project config", async () => {
			const opencodeDir = join(tmpDir, ".opencode");
			mkdirSync(opencodeDir, { recursive: true });
			writeFileSync(
				join(opencodeDir, "luthier.jsonc"),
				JSON.stringify(
					{
						hooks: { "chat-message": { inject_context: true, system_directives: ["Be concise"] } },
					},
					null,
					2,
				),
			);

			const toolDef = createLuthierConfigTool(DEFAULT_CONFIG, mockCtx);
			await toolDef.execute({ action: "reset", key: "hooks.chat-message.inject_context" }, makeMockContext() as never);

			const written = JSON.parse(readFileSync(join(opencodeDir, "luthier.jsonc"), "utf-8"));
			expect("inject_context" in written.hooks["chat-message"]).toBe(false);
			expect(written.hooks["chat-message"].system_directives).toEqual(["Be concise"]);
		});

		it("calls toast notification on success", async () => {
			const opencodeDir = join(tmpDir, ".opencode");
			mkdirSync(opencodeDir, { recursive: true });
			writeFileSync(join(opencodeDir, "luthier.jsonc"), JSON.stringify({ disabled_hooks: [] }));

			const logSpy = spyOn(mockCtx.client.app, "log").mockResolvedValue({} as never);
			const toolDef = createLuthierConfigTool(DEFAULT_CONFIG, mockCtx);
			await toolDef.execute({ action: "reset", key: "disabled_hooks" }, makeMockContext() as never);
			expect(logSpy).toHaveBeenCalled();
		});
	});
});

describe("luthier-command hooks", () => {
	beforeEach(() => {
		spyOn(console, "log").mockImplementation(() => {});
	});

	it("config hook registers /luthier command", async () => {
		const { createLuthierCommandConfigHook } = await import("../hooks/luthier-command.js");
		const hook = createLuthierCommandConfigHook(DEFAULT_CONFIG);
		const input = {} as Record<string, unknown>;
		await hook!(input as never);
		expect((input as any).command.luthier).toBeDefined();
		expect((input as any).command.luthier.template).toContain("luthier_config");
		expect((input as any).command.luthier.description).toBeDefined();
	});

	it("config hook does not overwrite existing /luthier command", async () => {
		const { createLuthierCommandConfigHook } = await import("../hooks/luthier-command.js");
		const hook = createLuthierCommandConfigHook(DEFAULT_CONFIG);
		const existing = { template: "custom", description: "custom" };
		const input = { command: { luthier: existing } } as Record<string, unknown>;
		await hook!(input as never);
		expect((input as any).command.luthier).toBe(existing);
	});

	it("before hook injects guide prompt for /luthier command", async () => {
		const { createLuthierCommandBeforeHook } = await import("../hooks/luthier-command.js");
		const hook = createLuthierCommandBeforeHook(DEFAULT_CONFIG);
		const output = { parts: [] as unknown[] };
		await hook!({ command: "luthier", sessionID: "test", arguments: "" }, output as never);
		expect(output.parts.length).toBe(1);
		expect((output.parts[0] as any).type).toBe("text");
		expect((output.parts[0] as any).text).toContain("luthier_config");
	});

	it("before hook includes user arguments in prompt", async () => {
		const { createLuthierCommandBeforeHook } = await import("../hooks/luthier-command.js");
		const hook = createLuthierCommandBeforeHook(DEFAULT_CONFIG);
		const output = { parts: [] as unknown[] };
		await hook!(
			{ command: "luthier", sessionID: "test", arguments: "set hooks.chat-message.inject_context true" },
			output as never,
		);
		expect((output.parts[0] as any).text).toContain("set hooks.chat-message.inject_context true");
	});

	it("before hook ignores non-luthier commands", async () => {
		const { createLuthierCommandBeforeHook } = await import("../hooks/luthier-command.js");
		const hook = createLuthierCommandBeforeHook(DEFAULT_CONFIG);
		const output = { parts: [] as unknown[] };
		await hook!({ command: "other-command", sessionID: "test", arguments: "" }, output as never);
		expect(output.parts.length).toBe(0);
	});
});
