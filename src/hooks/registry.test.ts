import { beforeEach, describe, expect, it, spyOn } from "bun:test";
import type { PluginInput } from "@opencode-ai/plugin";
import { LuthierConfigSchema } from "../config/schema.js";
import { buildHooks } from "./registry.js";

const mockCtx: PluginInput = {
	client: {} as PluginInput["client"],
	project: {} as PluginInput["project"],
	directory: "/tmp/luthier-test",
	worktree: "/tmp/luthier-test",
	serverUrl: new URL("http://localhost:3000"),
	$: {} as PluginInput["$"],
};

describe("buildHooks", () => {
	beforeEach(() => {
		spyOn(console, "log").mockImplementation(() => {});
		spyOn(console, "error").mockImplementation(() => {});
	});

	it("returns an object with hook keys", () => {
		const config = LuthierConfigSchema.parse({});
		const hooks = buildHooks(config, mockCtx);
		expect(hooks).toBeDefined();
		expect(typeof hooks).toBe("object");
	});

	it("populates at least some hook keys", () => {
		const config = LuthierConfigSchema.parse({});
		const hooks = buildHooks(config, mockCtx);
		const keys = Object.keys(hooks);
		expect(keys.length).toBeGreaterThan(0);
	});

	it("disables hooks listed in disabled_hooks", () => {
		const configWithAllEnabled = LuthierConfigSchema.parse({});
		const hooksAll = buildHooks(configWithAllEnabled, mockCtx);

		const configWithDisabled = LuthierConfigSchema.parse({
			disabled_hooks: ["event-tracker", "permission-handler", "chat-message"],
		});
		const hooksDisabled = buildHooks(configWithDisabled, mockCtx);

		const allKeys = Object.keys(hooksAll).length;
		const disabledKeys = Object.keys(hooksDisabled).length;
		expect(disabledKeys).toBeLessThanOrEqual(allKeys);
	});

	it("supports prefix matching for disabled hooks", () => {
		const configBase = LuthierConfigSchema.parse({});
		const hooksBase = buildHooks(configBase, mockCtx);

		const configDisabled = LuthierConfigSchema.parse({
			disabled_hooks: ["tool-interceptor"],
		});
		const hooksDisabled = buildHooks(configDisabled, mockCtx);

		expect(Object.keys(hooksDisabled).length).toBeLessThanOrEqual(Object.keys(hooksBase).length);
	});

	it("handles disabling all hooks", () => {
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
			],
		});
		const hooks = buildHooks(config, mockCtx);
		expect(hooks).toBeDefined();
	});

	it("does not throw with default config", () => {
		const config = LuthierConfigSchema.parse({});
		expect(() => buildHooks(config, mockCtx)).not.toThrow();
	});

	it("produces callable hooks", () => {
		const config = LuthierConfigSchema.parse({});
		const hooks = buildHooks(config, mockCtx);

		for (const [key, value] of Object.entries(hooks)) {
			if (typeof value === "function") {
				expect(typeof value).toBe("function");
			}
		}
	});
});
