import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LuthierConfigSchema } from "../config/schema.js";
import { loadCustomModules, toPromptModule } from "./custom-loader.js";

describe("loadCustomModules", () => {
	let tempDir: string;
	let modulesDir: string;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), "luthier-custom-"));
		modulesDir = join(tempDir, ".opencode", "luthier", "modules");
		mkdirSync(modulesDir, { recursive: true });
		spyOn(console, "log").mockImplementation(() => {});
		spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		rmSync(tempDir, { recursive: true, force: true });
	});

	it("returns empty array when no modules directory exists", () => {
		const config = LuthierConfigSchema.parse({});
		const modules = loadCustomModules(config, "/nonexistent/path");
		expect(modules).toEqual([]);
	});

	it("returns empty array when directory is empty", () => {
		const config = LuthierConfigSchema.parse({});
		const modules = loadCustomModules(config, tempDir);
		expect(modules).toEqual([]);
	});

	it("loads a simple module from .md file", () => {
		writeFileSync(
			join(modulesDir, "my-rules.md"),
			["---", "name: my-rules", "description: Custom rules", "priority: 60", "---", "", "Always be polite."].join("\n"),
		);
		const config = LuthierConfigSchema.parse({});
		const modules = loadCustomModules(config, tempDir);
		expect(modules).toHaveLength(1);
		expect(modules[0].meta.name).toBe("my-rules");
		expect(modules[0].meta.description).toBe("Custom rules");
		expect(modules[0].meta.priority).toBe(60);
		expect(modules[0].body).toBe("Always be polite.");
	});

	it("uses filename as name when frontmatter has no name", () => {
		writeFileSync(
			join(modulesDir, "fallback-name.md"),
			["---", "description: Test", "---", "", "Content here."].join("\n"),
		);
		const config = LuthierConfigSchema.parse({});
		const modules = loadCustomModules(config, tempDir);
		expect(modules[0].meta.name).toBe("fallback-name");
	});

	it("defaults priority to 100 when not specified", () => {
		writeFileSync(join(modulesDir, "no-priority.md"), ["---", "name: no-priority", "---", "", "Body."].join("\n"));
		const config = LuthierConfigSchema.parse({});
		const modules = loadCustomModules(config, tempDir);
		expect(modules[0].meta.priority).toBe(100);
	});

	it("sorts modules by priority (lower first)", () => {
		writeFileSync(join(modulesDir, "low.md"), ["---", "name: low", "priority: 10", "---", "", "Low."].join("\n"));
		writeFileSync(join(modulesDir, "high.md"), ["---", "name: high", "priority: 200", "---", "", "High."].join("\n"));
		writeFileSync(join(modulesDir, "mid.md"), ["---", "name: mid", "priority: 50", "---", "", "Mid."].join("\n"));
		const config = LuthierConfigSchema.parse({});
		const modules = loadCustomModules(config, tempDir);
		expect(modules.map((m) => m.meta.name)).toEqual(["low", "mid", "high"]);
	});

	it("skips module disabled via frontmatter enabled: false", () => {
		writeFileSync(
			join(modulesDir, "disabled.md"),
			["---", "name: disabled", "enabled: false", "---", "", "Ignored."].join("\n"),
		);
		const config = LuthierConfigSchema.parse({});
		const modules = loadCustomModules(config, tempDir);
		expect(modules).toHaveLength(0);
	});

	it("skips module disabled via config.modules.custom.disabled", () => {
		writeFileSync(join(modulesDir, "blocked.md"), ["---", "name: blocked", "---", "", "Blocked."].join("\n"));
		const config = LuthierConfigSchema.parse({ modules: { custom: { disabled: ["blocked"] } } });
		const modules = loadCustomModules(config, tempDir);
		expect(modules).toHaveLength(0);
	});

	it("later directory overrides earlier on duplicate name", () => {
		const extraDir = join(tempDir, "extra-modules");
		mkdirSync(extraDir, { recursive: true });
		writeFileSync(join(modulesDir, "dup.md"), ["---", "name: dup", "---", "", "Original."].join("\n"));
		writeFileSync(join(extraDir, "dup.md"), ["---", "name: dup", "---", "", "Override."].join("\n"));
		const config = LuthierConfigSchema.parse({
			modules: { custom: { extra_directories: [extraDir] } },
		});
		const modules = loadCustomModules(config, tempDir);
		expect(modules).toHaveLength(1);
		expect(modules[0].body).toBe("Override.");
	});

	it("discovers files in nested subdirectories", () => {
		const subDir = join(modulesDir, "sub");
		mkdirSync(subDir, { recursive: true });
		writeFileSync(join(subDir, "nested.md"), ["---", "name: nested", "---", "", "Nested content."].join("\n"));
		const config = LuthierConfigSchema.parse({});
		const modules = loadCustomModules(config, tempDir);
		expect(modules).toHaveLength(1);
		expect(modules[0].meta.name).toBe("nested");
	});

	it("handles file without frontmatter (plain markdown)", () => {
		writeFileSync(join(modulesDir, "plain.md"), "Just some rules.\nNo frontmatter.");
		const config = LuthierConfigSchema.parse({});
		const modules = loadCustomModules(config, tempDir);
		expect(modules).toHaveLength(1);
		expect(modules[0].meta.name).toBe("plain");
		expect(modules[0].body).toContain("Just some rules.");
	});
});

describe("toPromptModule", () => {
	it("returns PromptModule with correct name", () => {
		const mod = {
			meta: { name: "test", description: "", priority: 100, enabled: true },
			body: "Test content.",
			sourcePath: "/test.md",
		};
		const pm = toPromptModule(mod);
		expect(pm.name).toBe("test");
	});

	it("returns body as single fragment", () => {
		const mod = {
			meta: { name: "test", description: "", priority: 100, enabled: true },
			body: "Test content.",
			sourcePath: "/test.md",
		};
		const pm = toPromptModule(mod);
		const fragments = pm.getPromptFragments({} as never, {} as never);
		expect(fragments).toEqual(["Test content."]);
	});

	it("returns empty array for empty body", () => {
		const mod = {
			meta: { name: "empty", description: "", priority: 100, enabled: true },
			body: "",
			sourcePath: "/empty.md",
		};
		const pm = toPromptModule(mod);
		const fragments = pm.getPromptFragments({} as never, {} as never);
		expect(fragments).toEqual([]);
	});
});
