import { afterEach, beforeEach, describe, expect, it, spyOn } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadLuthierConfig } from "./loader.js";

describe("loadLuthierConfig", () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), "luthier-test-"));
		spyOn(console, "log").mockImplementation(() => {});
		spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		rmSync(tempDir, { recursive: true, force: true });
	});

	it("returns defaults when no config files exist", () => {
		const projectDir = join(tempDir, "nonexistent-project");
		const config = loadLuthierConfig(projectDir);
		expect(config.disabled_hooks).toEqual([]);
		expect(config.session_tracking.enabled).toBe(true);
		expect(config.hooks["chat-message"].inject_context).toBe(false);
	});

	it("loads project-level config", () => {
		const projectDir = join(tempDir, "project");
		const opencodeDir = join(projectDir, ".opencode");
		mkdirSync(opencodeDir, { recursive: true });
		writeFileSync(
			join(opencodeDir, "luthier.jsonc"),
			JSON.stringify({
				disabled_hooks: ["shell-env"],
				tui: { toast: { duration: 5000 } },
			}),
		);

		const config = loadLuthierConfig(projectDir);
		expect(config.disabled_hooks).toEqual(["shell-env"]);
		expect(config.tui.toast.duration).toBe(5000);
	});

	it("applies project config overrides on top of defaults", () => {
		const projectDir = join(tempDir, "project");
		const opencodeDir = join(projectDir, ".opencode");
		mkdirSync(opencodeDir, { recursive: true });
		writeFileSync(
			join(opencodeDir, "luthier.jsonc"),
			JSON.stringify({
				disabled_hooks: ["shell-env"],
				tui: { toast: { duration: 5000 } },
			}),
		);

		const config = loadLuthierConfig(projectDir);
		expect(config.disabled_hooks).toEqual(["shell-env"]);
		expect(config.tui.toast.duration).toBe(5000);
		expect(config.tui.toast.enabled).toBe(true);
		expect(config.session_tracking.logLevel).toBe("minimal");
	});

	it("handles JSONC with comments", () => {
		const projectDir = join(tempDir, "project");
		const opencodeDir = join(projectDir, ".opencode");
		mkdirSync(opencodeDir, { recursive: true });
		writeFileSync(
			join(opencodeDir, "luthier.jsonc"),
			`{
	// This is a comment
	"disabled_hooks": ["event-tracker"],
	/* Multi-line
	   comment */
	"session_tracking": {
		"logLevel": "verbose"
	}
}`,
		);

		const config = loadLuthierConfig(projectDir);
		expect(config.disabled_hooks).toEqual(["event-tracker"]);
		expect(config.session_tracking.logLevel).toBe("verbose");
	});

	it("falls back to defaults on malformed JSONC", () => {
		const projectDir = join(tempDir, "project");
		const opencodeDir = join(projectDir, ".opencode");
		mkdirSync(opencodeDir, { recursive: true });
		writeFileSync(join(opencodeDir, "luthier.jsonc"), "not valid json {{{");

		const config = loadLuthierConfig(projectDir);
		expect(config.disabled_hooks).toEqual([]);
		expect(config.session_tracking.enabled).toBe(true);
	});

	it("falls back to defaults on invalid config values", () => {
		const projectDir = join(tempDir, "project");
		const opencodeDir = join(projectDir, ".opencode");
		mkdirSync(opencodeDir, { recursive: true });
		writeFileSync(
			join(opencodeDir, "luthier.jsonc"),
			JSON.stringify({
				agents: { oracle: { temperature: 999 } },
			}),
		);

		const config = loadLuthierConfig(projectDir);
		expect(config.disabled_hooks).toEqual([]);
	});

	it("merges partial hook config with defaults", () => {
		const projectDir = join(tempDir, "project");
		const opencodeDir = join(projectDir, ".opencode");
		mkdirSync(opencodeDir, { recursive: true });
		writeFileSync(
			join(opencodeDir, "luthier.jsonc"),
			JSON.stringify({
				hooks: {
					"chat-message": {
						system_directives: ["Use Korean"],
					},
				},
			}),
		);

		const config = loadLuthierConfig(projectDir);
		expect(config.hooks["chat-message"].system_directives).toEqual(["Use Korean"]);
		expect(config.hooks["chat-message"].inject_context).toBe(false);
		expect(config.hooks["permission-handler"].auto_allow).toEqual([]);
	});

	it("loads complex nested config correctly", () => {
		const projectDir = join(tempDir, "project");
		const opencodeDir = join(projectDir, ".opencode");
		mkdirSync(opencodeDir, { recursive: true });
		writeFileSync(
			join(opencodeDir, "luthier.jsonc"),
			JSON.stringify({
				agents: {
					oracle: { model: "claude-sonnet-4-20250514", temperature: 0.5 },
				},
				mcp: {
					custom: [{ name: "my-server", type: "remote", url: "https://example.com" }],
				},
				notifications: {
					on_complete: true,
					channels: [{ type: "discord", webhook: "$DISCORD_URL" }],
				},
			}),
		);

		const config = loadLuthierConfig(projectDir);
		expect(config.agents.oracle.model).toBe("claude-sonnet-4-20250514");
		expect(config.agents.oracle.temperature).toBe(0.5);
		expect(config.mcp.custom).toHaveLength(1);
		expect(config.notifications.on_complete).toBe(true);
		expect(config.notifications.channels[0].type).toBe("discord");
	});
});
