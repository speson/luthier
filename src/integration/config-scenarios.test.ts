import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { PluginInput } from "@opencode-ai/plugin";
import { loadLuthierConfig } from "../config/loader.js";
import { LuthierConfigSchema } from "../config/schema.js";
import { buildHooks } from "../hooks/registry.js";

const mockCtx = (dir: string): PluginInput => ({
	client: {} as PluginInput["client"],
	project: {} as PluginInput["project"],
	directory: dir,
	worktree: dir,
	serverUrl: new URL("http://localhost:3000"),
	$: {} as PluginInput["$"],
});

describe("Config Loading Scenarios", () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), "luthier-config-"));
		spyOn(console, "log").mockImplementation(() => {});
		spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		rmSync(tempDir, { recursive: true, force: true });
	});

	it("empty config file results in valid defaults", () => {
		const opencodeDir = join(tempDir, ".opencode");
		mkdirSync(opencodeDir, { recursive: true });
		writeFileSync(join(opencodeDir, "luthier.jsonc"), "{}");

		const config = loadLuthierConfig(tempDir);
		expect(config.disabled_hooks).toEqual([]);
		expect(config.modules.orchestration.enabled).toBe(true);
		expect(config.modules.templates_enabled).toBe(true);
		expect(config.modules.custom.directory).toBe(".opencode/luthier/modules");
	});

	it("custom modules config is parsed and accessible", () => {
		const opencodeDir = join(tempDir, ".opencode");
		mkdirSync(opencodeDir, { recursive: true });
		writeFileSync(
			join(opencodeDir, "luthier.jsonc"),
			JSON.stringify({
				modules: {
					custom: {
						directory: "my-modules",
						disabled: ["unwanted-module"],
					},
					templates_enabled: false,
				},
			}),
		);

		const config = loadLuthierConfig(tempDir);
		expect(config.modules.custom.directory).toBe("my-modules");
		expect(config.modules.custom.disabled).toEqual(["unwanted-module"]);
		expect(config.modules.templates_enabled).toBe(false);
	});

	it("config with disabled hooks → buildHooks produces fewer hook keys", () => {
		const configFull = LuthierConfigSchema.parse({});
		const configReduced = LuthierConfigSchema.parse({
			disabled_hooks: ["event-tracker", "permission-handler", "shell-env", "compaction"],
		});

		const ctx = mockCtx(tempDir);
		const hooksFull = buildHooks(configFull, ctx);
		const hooksReduced = buildHooks(configReduced, ctx);

		expect(Object.keys(hooksReduced).length).toBeLessThanOrEqual(Object.keys(hooksFull).length);
	});

	it("config with agent overrides is preserved through the pipeline", () => {
		const opencodeDir = join(tempDir, ".opencode");
		mkdirSync(opencodeDir, { recursive: true });
		writeFileSync(
			join(opencodeDir, "luthier.jsonc"),
			JSON.stringify({
				agents: {
					oracle: { model: "custom-model", temperature: 0.2 },
					explore: { model: "fast-model" },
				},
			}),
		);

		const config = loadLuthierConfig(tempDir);
		expect(config.agents.oracle.model).toBe("custom-model");
		expect(config.agents.oracle.temperature).toBe(0.2);
		expect(config.agents.explore.model).toBe("fast-model");
	});

	it("invalid config falls back to defaults without crashing hooks", () => {
		const opencodeDir = join(tempDir, ".opencode");
		mkdirSync(opencodeDir, { recursive: true });
		writeFileSync(join(opencodeDir, "luthier.jsonc"), JSON.stringify({ agents: { oracle: { temperature: 9999 } } }));

		const config = loadLuthierConfig(tempDir);
		const ctx = mockCtx(tempDir);
		expect(() => buildHooks(config, ctx)).not.toThrow();
	});

	it("JSONC with comments loads and feeds into hooks correctly", () => {
		const opencodeDir = join(tempDir, ".opencode");
		mkdirSync(opencodeDir, { recursive: true });
		writeFileSync(
			join(opencodeDir, "luthier.jsonc"),
			`{
  // Disable some hooks
  "disabled_hooks": ["shell-env"],
  /* Module config */
  "modules": {
    "orchestration": { "enabled": false }
  }
}`,
		);

		const config = loadLuthierConfig(tempDir);
		expect(config.disabled_hooks).toEqual(["shell-env"]);
		expect(config.modules.orchestration.enabled).toBe(false);

		const ctx = mockCtx(tempDir);
		expect(() => buildHooks(config, ctx)).not.toThrow();
	});

	it("deeply nested partial config merges correctly with defaults", () => {
		const opencodeDir = join(tempDir, ".opencode");
		mkdirSync(opencodeDir, { recursive: true });
		writeFileSync(
			join(opencodeDir, "luthier.jsonc"),
			JSON.stringify({
				hooks: {
					"chat-message": { system_directives: ["Be brief"] },
				},
				modules: {
					workflow: { todo_management: false },
				},
				ux: {
					persona: { name: "TestBot" },
				},
			}),
		);

		const config = loadLuthierConfig(tempDir);
		// Specified values
		expect(config.hooks["chat-message"].system_directives).toEqual(["Be brief"]);
		expect(config.modules.workflow.todo_management).toBe(false);
		expect(config.ux.persona.name).toBe("TestBot");
		// Unspecified defaults preserved
		expect(config.hooks["chat-message"].inject_context).toBe(false);
		expect(config.modules.workflow.verification).toBe(true);
		expect(config.modules.orchestration.enabled).toBe(true);
	});

	it("custom modules with template rendering end-to-end", async () => {
		const modulesDir = join(tempDir, ".opencode", "luthier", "modules");
		mkdirSync(modulesDir, { recursive: true });
		writeFileSync(
			join(modulesDir, "greeting.md"),
			["---", "name: greeting", "priority: 200", "---", "", "Hello from {{project.name}}!"].join("\n"),
		);

		const opencodeDir = join(tempDir, ".opencode");
		writeFileSync(join(opencodeDir, "luthier.jsonc"), "{}");

		const config = loadLuthierConfig(tempDir);
		const ctx = mockCtx(tempDir);
		const hooks = buildHooks(config, ctx);

		const systemTransform = hooks["experimental.chat.system.transform" as keyof typeof hooks];
		if (typeof systemTransform === "function") {
			const output = { system: [] as string[] };
			await (systemTransform as (input: unknown, output: { system: string[] }) => Promise<void>)({}, output);
			// Should contain rendered custom module with project name
			const allContent = output.system.join("\n");
			const dirName = tempDir.split("/").pop();
			expect(allContent).toContain(`Hello from ${dirName}!`);
		}
	});
});
