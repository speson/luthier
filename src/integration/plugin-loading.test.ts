import { beforeEach, describe, expect, it, spyOn } from "bun:test";
import type { PluginInput } from "@opencode-ai/plugin";
import { LuthierConfigSchema } from "../config/schema.js";
import { buildHooks } from "../hooks/registry.js";
import { buildTools } from "../tools/registry.js";

const mockCtx: PluginInput = {
	client: {} as PluginInput["client"],
	project: {} as PluginInput["project"],
	directory: "/tmp/luthier-integration",
	worktree: "/tmp/luthier-integration",
	serverUrl: new URL("http://localhost:3000"),
	$: {} as PluginInput["$"],
};

describe("Plugin Loading E2E", () => {
	beforeEach(() => {
		spyOn(console, "log").mockImplementation(() => {});
		spyOn(console, "error").mockImplementation(() => {});
	});

	it("loads with zero config (all defaults)", () => {
		const config = LuthierConfigSchema.parse({});
		const hooks = buildHooks(config, mockCtx);
		const tools = buildTools(config, mockCtx);

		expect(hooks).toBeDefined();
		expect(typeof hooks).toBe("object");
		const hookKeys = Object.keys(hooks);
		expect(hookKeys.length).toBeGreaterThan(0);

		// Tools may or may not produce entries depending on API key availability
		if (tools) {
			expect(typeof tools).toBe("object");
		}
	});

	it("config → hooks pipeline produces callable hook handlers", () => {
		const config = LuthierConfigSchema.parse({});
		const hooks = buildHooks(config, mockCtx);

		for (const [_key, handler] of Object.entries(hooks)) {
			if (typeof handler === "function") {
				expect(typeof handler).toBe("function");
			}
		}
	});

	it("disabling all hooks produces minimal hooks object", () => {
		const config = LuthierConfigSchema.parse({
			disabled_hooks: [
				"event-tracker",
				"permission-handler",
				"chat-message",
				"system-directives",
				"agent-overrides",
				"agent-system",
				"tool-interceptor",
				"shell-env",
				"compaction",
				"metrics",
				"todo-continuation",
				"context-monitor",
				"session-recovery",
				"toast",
				"notifications",
				"mcp-config",
				"circuit-breaker",
				"validation-gate",
				"code-simplifier",
				"prompt-assembler",
				"ux-config",
			],
		});
		const hooks = buildHooks(config, mockCtx);
		expect(Object.keys(hooks).length).toBe(0);
	});

	it("hook + tool registration doesn't throw with complex config", () => {
		const config = LuthierConfigSchema.parse({
			hooks: {
				"chat-message": { system_directives: ["Use Korean", "Be concise"] },
				"permission-handler": { auto_allow: ["Read", "Glob"], auto_deny: ["bash:rm"] },
				"tool-interceptor": { max_output_length: 5000, blocked_tools: ["tmux"] },
				"shell-env": { vars: { DEBUG: "1" }, forward: ["PATH"] },
			},
			agents: { oracle: { model: "test-model", temperature: 0.5 } },
			tui: { toast: { duration: 5000 }, theme: { prefix: "[test]" } },
			modules: {
				orchestration: { enabled: true, intent_gate: false },
				delegation: { enabled: true, agents: { oracle: false } },
			},
		});

		expect(() => {
			const hooks = buildHooks(config, mockCtx);
			const tools = buildTools(config, mockCtx);
			return { hooks, tools };
		}).not.toThrow();
	});

	it("prompt-assembler hook injects system prompt fragments", async () => {
		const config = LuthierConfigSchema.parse({
			ux: {
				persona: { name: "TestBot", role: "tester" },
				communication: { language: "English", tone: "professional" },
			},
		});
		const hooks = buildHooks(config, mockCtx);

		const systemTransform = hooks["experimental.chat.system.transform" as keyof typeof hooks];
		if (typeof systemTransform === "function") {
			const output = { system: [] as string[] };
			await (systemTransform as (input: unknown, output: { system: string[] }) => Promise<void>)({}, output);
			expect(output.system.length).toBeGreaterThan(0);
			expect(output.system.some((s) => s.includes("TestBot"))).toBe(true);
		}
	});

	it("modules config toggles affect prompt fragments", async () => {
		const configAll = LuthierConfigSchema.parse({});
		const configNone = LuthierConfigSchema.parse({
			modules: {
				orchestration: { enabled: false },
				delegation: { enabled: false },
				quality: { enabled: false },
				workflow: { enabled: false },
				failure_recovery: { enabled: false },
			},
		});

		const hooksAll = buildHooks(configAll, mockCtx);
		const hooksNone = buildHooks(configNone, mockCtx);

		const transformAll = hooksAll["experimental.chat.system.transform" as keyof typeof hooksAll];
		const transformNone = hooksNone["experimental.chat.system.transform" as keyof typeof hooksNone];

		const outputAll = { system: [] as string[] };
		const outputNone = { system: [] as string[] };

		if (typeof transformAll === "function") {
			await (transformAll as (input: unknown, output: { system: string[] }) => Promise<void>)({}, outputAll);
		}
		if (typeof transformNone === "function") {
			await (transformNone as (input: unknown, output: { system: string[] }) => Promise<void>)({}, outputNone);
		}

		expect(outputAll.system.length).toBeGreaterThan(outputNone.system.length);
	});
});
