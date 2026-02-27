import { describe, expect, it } from "bun:test";
import type { PluginInput } from "@opencode-ai/plugin";
import { LuthierConfigSchema } from "../config/schema.js";
import { createDelegationModule } from "./delegation.js";

const mockCtx: PluginInput = {
	client: {} as PluginInput["client"],
	project: {} as PluginInput["project"],
	directory: "/tmp/luthier-test",
	worktree: "/tmp/luthier-test",
	serverUrl: new URL("http://localhost:3000"),
	$: {} as PluginInput["$"],
};

describe("createDelegationModule", () => {
	it("returns empty array when enabled=false", () => {
		const config = LuthierConfigSchema.parse({ modules: { delegation: { enabled: false } } });
		const module = createDelegationModule();
		expect(module.getPromptFragments(config, mockCtx)).toEqual([]);
	});

	it("returns fragments when enabled (default)", () => {
		const config = LuthierConfigSchema.parse({});
		const module = createDelegationModule();
		const fragments = module.getPromptFragments(config, mockCtx);
		expect(fragments.length).toBeGreaterThan(0);
	});

	it("excludes oracle from agent defs when agents.oracle=false", () => {
		const config = LuthierConfigSchema.parse({
			modules: { delegation: { enabled: true, agents: { oracle: false } } },
		});
		const module = createDelegationModule();
		const fragments = module.getPromptFragments(config, mockCtx);
		const combined = fragments.join("\n");
		expect(combined.includes("oracle")).toBe(false);
	});

	it("fragment contains 'session' keyword (delegation protocol)", () => {
		const config = LuthierConfigSchema.parse({});
		const module = createDelegationModule();
		const fragments = module.getPromptFragments(config, mockCtx);
		const combined = fragments.join("\n");
		expect(combined.toLowerCase().includes("session")).toBe(true);
	});

	it("fragment contains 'parallel' keyword", () => {
		const config = LuthierConfigSchema.parse({});
		const module = createDelegationModule();
		const fragments = module.getPromptFragments(config, mockCtx);
		const combined = fragments.join("\n");
		expect(combined.toLowerCase().includes("parallel")).toBe(true);
	});

	it("module name is 'delegation'", () => {
		const module = createDelegationModule();
		expect(module.name).toBe("delegation");
	});
});
