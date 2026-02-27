import { describe, expect, it } from "bun:test";
import type { PluginInput } from "@opencode-ai/plugin";
import { LuthierConfigSchema } from "../config/schema.js";
import { getEnabledModules } from "./registry.js";

const mockCtx: PluginInput = {
	client: {} as PluginInput["client"],
	project: {} as PluginInput["project"],
	directory: "/tmp/luthier-test",
	worktree: "/tmp/luthier-test",
	serverUrl: new URL("http://localhost:3000"),
	$: {} as PluginInput["$"],
};

describe("getEnabledModules", () => {
	it("returns 5 modules with default config (all enabled)", () => {
		const config = LuthierConfigSchema.parse({});
		const modules = getEnabledModules(config);
		expect(modules.length).toBe(5);
	});

	it("returns 4 modules when orchestration disabled", () => {
		const config = LuthierConfigSchema.parse({ modules: { orchestration: { enabled: false } } });
		const modules = getEnabledModules(config);
		expect(modules.length).toBe(4);
	});

	it("returns 0 modules when all disabled", () => {
		const config = LuthierConfigSchema.parse({
			modules: {
				orchestration: { enabled: false },
				delegation: { enabled: false },
				quality: { enabled: false },
				workflow: { enabled: false },
				failure_recovery: { enabled: false },
			},
		});
		const modules = getEnabledModules(config);
		expect(modules.length).toBe(0);
	});

	it("module names match expected canonical names", () => {
		const config = LuthierConfigSchema.parse({});
		const modules = getEnabledModules(config);
		const names = modules.map((m) => m.name);
		expect(names).toContain("orchestration");
		expect(names).toContain("delegation");
		expect(names).toContain("quality-rules");
		expect(names).toContain("workflow");
		expect(names).toContain("failure-recovery");
	});

	it("each module has getPromptFragments function", () => {
		const config = LuthierConfigSchema.parse({});
		const modules = getEnabledModules(config);
		for (const module of modules) {
			expect(typeof module.getPromptFragments).toBe("function");
			// Should not throw
			const fragments = module.getPromptFragments(config, mockCtx);
			expect(Array.isArray(fragments)).toBe(true);
		}
	});

	it("modules returned in canonical order", () => {
		const config = LuthierConfigSchema.parse({});
		const modules = getEnabledModules(config);
		const names = modules.map((m) => m.name);
		expect(names[0]).toBe("orchestration");
		expect(names[1]).toBe("delegation");
		expect(names[2]).toBe("quality-rules");
		expect(names[3]).toBe("workflow");
		expect(names[4]).toBe("failure-recovery");
	});
});
