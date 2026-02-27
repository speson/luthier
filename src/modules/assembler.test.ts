import { describe, expect, it } from "bun:test";
import type { Hooks, PluginInput } from "@opencode-ai/plugin";
import { LuthierConfigSchema } from "../config/schema.js";
import { createPromptAssemblerHook } from "./assembler.js";

type SystemTransformInput = Parameters<NonNullable<Hooks["experimental.chat.system.transform"]>>[0];

const mockCtx: PluginInput = {
	client: {} as PluginInput["client"],
	project: {} as PluginInput["project"],
	directory: "/tmp/luthier-test",
	worktree: "/tmp/luthier-test",
	serverUrl: new URL("http://localhost:3000"),
	$: {} as PluginInput["$"],
};

const mockInput = {} as SystemTransformInput;

describe("createPromptAssemblerHook", () => {
	it("returns a function when default config (modules + default preset persona)", () => {
		const config = LuthierConfigSchema.parse({});
		const hook = createPromptAssemblerHook(config, mockCtx);
		expect(typeof hook).toBe("function");
	});

	it("returns hook function when modules are enabled", () => {
		const config = LuthierConfigSchema.parse({});
		const hook = createPromptAssemblerHook(config, mockCtx);
		expect(typeof hook).toBe("function");
	});

	it("hook pushes fragments to output.system", async () => {
		const config = LuthierConfigSchema.parse({});
		const hook = createPromptAssemblerHook(config, mockCtx);
		expect(hook).toBeDefined();
		const output = { system: [] as string[] };
		await hook?.(mockInput, output);
		expect(output.system.length).toBeGreaterThan(0);
	});

	it("persona fragment pushed when configured", async () => {
		const config = LuthierConfigSchema.parse({
			ux: { persona: { name: "TestBot", role: "tester", traits: ["precise"] } },
		});
		const hook = createPromptAssemblerHook(config, mockCtx);
		expect(hook).toBeDefined();
		const output = { system: [] as string[] };
		await hook?.(mockInput, output);
		expect(output.system.some((s) => s.includes("TestBot"))).toBe(true);
	});

	it("disabling all modules reduces fragment count vs default", async () => {
		const configFull = LuthierConfigSchema.parse({});
		const configNoModules = LuthierConfigSchema.parse({
			modules: {
				orchestration: { enabled: false },
				delegation: { enabled: false },
				quality: { enabled: false },
				workflow: { enabled: false },
				failure_recovery: { enabled: false },
			},
		});
		const hookFull = createPromptAssemblerHook(configFull, mockCtx);
		const hookNoModules = createPromptAssemblerHook(configNoModules, mockCtx);
		const outputFull = { system: [] as string[] };
		const outputNoModules = { system: [] as string[] };
		await hookFull?.(mockInput, outputFull);
		await hookNoModules?.(mockInput, outputNoModules);
		expect(outputFull.system.length).toBeGreaterThan(outputNoModules.system.length);
	});
});
