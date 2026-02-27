import { describe, expect, it } from "bun:test";
import type { PluginInput } from "@opencode-ai/plugin";
import { LuthierConfigSchema } from "../config/schema.js";
import { createOrchestrationModule } from "./orchestration.js";

const mockCtx: PluginInput = {
	client: {} as PluginInput["client"],
	project: {} as PluginInput["project"],
	directory: "/tmp/luthier-test",
	worktree: "/tmp/luthier-test",
	serverUrl: new URL("http://localhost:3000"),
	$: {} as PluginInput["$"],
};

describe("createOrchestrationModule", () => {
	it("returns empty array when enabled=false", () => {
		const config = LuthierConfigSchema.parse({ modules: { orchestration: { enabled: false } } });
		const module = createOrchestrationModule();
		expect(module.getPromptFragments(config, mockCtx)).toEqual([]);
	});

	it("returns 4 fragments when all phases enabled (default)", () => {
		const config = LuthierConfigSchema.parse({});
		const module = createOrchestrationModule();
		const fragments = module.getPromptFragments(config, mockCtx);
		expect(fragments.length).toBe(4);
	});

	it("returns 0 fragments when all phases disabled individually", () => {
		const config = LuthierConfigSchema.parse({
			modules: {
				orchestration: {
					enabled: true,
					intent_gate: false,
					codebase_assessment: false,
					execution: false,
					completion: false,
				},
			},
		});
		const module = createOrchestrationModule();
		expect(module.getPromptFragments(config, mockCtx)).toEqual([]);
	});

	it("excludes intent_gate fragment when intent_gate=false", () => {
		const config = LuthierConfigSchema.parse({
			modules: { orchestration: { enabled: true, intent_gate: false } },
		});
		const module = createOrchestrationModule();
		const fragments = module.getPromptFragments(config, mockCtx);
		expect(fragments.some((f) => f.includes("Intent Gate"))).toBe(false);
		expect(fragments.length).toBe(3);
	});

	it("fragment contains 'intent' keyword", () => {
		const config = LuthierConfigSchema.parse({});
		const module = createOrchestrationModule();
		const fragments = module.getPromptFragments(config, mockCtx);
		expect(fragments.some((f) => f.toLowerCase().includes("intent"))).toBe(true);
	});

	it("module name is 'orchestration'", () => {
		const module = createOrchestrationModule();
		expect(module.name).toBe("orchestration");
	});
});
