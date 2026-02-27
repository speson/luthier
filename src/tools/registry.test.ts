import { beforeEach, describe, expect, it, spyOn } from "bun:test";
import type { PluginInput } from "@opencode-ai/plugin";
import { LuthierConfigSchema } from "../config/schema.js";
import { buildTools } from "./registry.js";

const mockCtx: PluginInput = {
	client: {} as PluginInput["client"],
	project: {} as PluginInput["project"],
	directory: "/tmp/luthier-test",
	worktree: "/tmp/luthier-test",
	serverUrl: new URL("http://localhost:3000"),
	$: {} as PluginInput["$"],
};

describe("buildTools", () => {
	beforeEach(() => {
		spyOn(console, "log").mockImplementation(() => {});
		spyOn(console, "error").mockImplementation(() => {});
	});

	it("returns tool definitions with default config", () => {
		const config = LuthierConfigSchema.parse({});
		const tools = buildTools(config, mockCtx);
		expect(tools).toBeDefined();
		expect(typeof tools).toBe("object");
	});

	it("includes built-in tools by default", () => {
		const config = LuthierConfigSchema.parse({});
		const tools = buildTools(config, mockCtx);
		if (tools) {
			const toolNames = Object.keys(tools);
			expect(toolNames.length).toBeGreaterThan(0);
		}
	});

	it("disables tools in the disabled list (blacklist mode)", () => {
		const config = LuthierConfigSchema.parse({
			tools: { disabled: ["web-search"] },
		});
		const tools = buildTools(config, mockCtx);
		if (tools) {
			expect("web-search" in tools).toBe(false);
		}
	});

	it("only includes tools in the enabled list (whitelist mode)", () => {
		const config = LuthierConfigSchema.parse({
			tools: { enabled: ["session-info"] },
		});
		const tools = buildTools(config, mockCtx);
		if (tools) {
			expect("session-info" in tools).toBe(true);
			expect("web-search" in tools).toBe(false);
		}
	});

	it("returns undefined when all tools are disabled", () => {
		const config = LuthierConfigSchema.parse({
			tools: { disabled: ["web-search", "session-info"] },
		});
		const tools = buildTools(config, mockCtx);
		expect(tools).toBeUndefined();
	});

	it("empty enabled array falls through to default (all tools allowed)", () => {
		const config = LuthierConfigSchema.parse({
			tools: { enabled: [] },
		});
		const tools = buildTools(config, mockCtx);
		expect(tools).toBeDefined();
	});

	it("does not throw with default config", () => {
		const config = LuthierConfigSchema.parse({});
		expect(() => buildTools(config, mockCtx)).not.toThrow();
	});
});
