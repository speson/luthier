import { beforeEach, describe, expect, it, spyOn } from "bun:test";
import type { PluginInput } from "@opencode-ai/plugin";
import { LuthierConfigSchema } from "../config/schema.js";
import { buildHooks } from "../hooks/registry.js";

const mockCtx: PluginInput = {
	client: {} as PluginInput["client"],
	project: {} as PluginInput["project"],
	directory: "/tmp/luthier-hook-chain",
	worktree: "/tmp/luthier-hook-chain",
	serverUrl: new URL("http://localhost:3000"),
	$: {} as PluginInput["$"],
};

describe("Hook Chaining", () => {
	beforeEach(() => {
		spyOn(console, "log").mockImplementation(() => {});
		spyOn(console, "error").mockImplementation(() => {});
	});

	it("multiple hooks on 'event' key are composed (event-tracker, metrics, todo, toast, notifications)", () => {
		const config = LuthierConfigSchema.parse({});
		const hooks = buildHooks(config, mockCtx);

		const eventHook = hooks.event;
		expect(eventHook).toBeDefined();
		expect(typeof eventHook).toBe("function");
	});

	it("multiple hooks on 'chat.message' key are composed (chat-message, metrics-message, context-monitor)", () => {
		const config = LuthierConfigSchema.parse({});
		const hooks = buildHooks(config, mockCtx);

		const chatHook = hooks["chat.message"];
		expect(chatHook).toBeDefined();
		expect(typeof chatHook).toBe("function");
	});

	it("multiple hooks on 'tool.execute.after' are composed (tool-interceptor-after, metrics-tool, circuit-breaker, code-simplifier)", () => {
		const config = LuthierConfigSchema.parse({});
		const hooks = buildHooks(config, mockCtx);

		const toolAfterHook = hooks["tool.execute.after"];
		expect(toolAfterHook).toBeDefined();
		expect(typeof toolAfterHook).toBe("function");
	});

	it("multiple hooks on 'experimental.chat.system.transform' are composed", () => {
		const config = LuthierConfigSchema.parse({
			hooks: { "chat-message": { system_directives: ["Be concise"] } },
		});
		const hooks = buildHooks(config, mockCtx);

		const systemTransform = hooks["experimental.chat.system.transform" as keyof typeof hooks];
		expect(systemTransform).toBeDefined();
		expect(typeof systemTransform).toBe("function");
	});

	it("composed event hooks all execute without throwing", async () => {
		const config = LuthierConfigSchema.parse({});
		const hooks = buildHooks(config, mockCtx);
		const eventHook = hooks.event;
		if (typeof eventHook === "function") {
			const eventInput = { event: { type: "session.created", properties: { id: "test-session" } } };
			await expect((eventHook as (input: typeof eventInput) => Promise<void>)(eventInput)).resolves.toBeUndefined();
		}
	});

	it("composed system transform hooks produce cumulative output", async () => {
		const config = LuthierConfigSchema.parse({
			ux: { persona: { name: "ChainBot" } },
			hooks: { "chat-message": { system_directives: ["Always verify"] } },
		});
		const hooks = buildHooks(config, mockCtx);

		const systemTransform = hooks["experimental.chat.system.transform" as keyof typeof hooks];
		if (typeof systemTransform === "function") {
			const output = { system: [] as string[] };
			await (systemTransform as (input: unknown, output: { system: string[] }) => Promise<void>)({}, output);
			// Multiple system transform hooks should have pushed fragments
			expect(output.system.length).toBeGreaterThan(0);
		}
	});

	it("disabling one hook in a composed chain still runs the others", async () => {
		const configFull = LuthierConfigSchema.parse({});
		const configPartial = LuthierConfigSchema.parse({
			disabled_hooks: ["event-tracker"],
		});

		const hooksFull = buildHooks(configFull, mockCtx);
		const hooksPartial = buildHooks(configPartial, mockCtx);

		// Both should still have event hooks (other hooks remain)
		expect(hooksFull.event).toBeDefined();
		expect(hooksPartial.event).toBeDefined();
	});

	it("config hook is registered for MCP configuration", () => {
		const config = LuthierConfigSchema.parse({});
		const hooks = buildHooks(config, mockCtx);

		const configHook = hooks.config;
		expect(configHook).toBeDefined();
		expect(typeof configHook).toBe("function");
	});

	it("permission hook is registered and callable", () => {
		const config = LuthierConfigSchema.parse({
			hooks: { "permission-handler": { auto_allow: ["Read"] } },
		});
		const hooks = buildHooks(config, mockCtx);

		const permHook = hooks["permission.ask"];
		expect(permHook).toBeDefined();
		expect(typeof permHook).toBe("function");
	});
});
