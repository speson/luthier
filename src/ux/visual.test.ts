import { describe, expect, it } from "bun:test";
import type { Config } from "@opencode-ai/sdk";
import { LuthierConfigSchema } from "../config/schema.js";
import { createUxConfigHook } from "./visual.js";

describe("createUxConfigHook", () => {
	it("returns undefined when no UX config to inject", () => {
		const config = LuthierConfigSchema.parse({});
		const hook = createUxConfigHook(config);
		expect(hook).toBeUndefined();
	});

	it("agent color injected when configured", async () => {
		const config = LuthierConfigSchema.parse({
			ux: { agents: { build: { color: "#7C3AED" } } },
		});
		const hook = createUxConfigHook(config);
		expect(hook).toBeDefined();
		const input = {} as Config;
		await hook?.(input);
		expect((input as Record<string, unknown>).agent).toBeDefined();
	});

	it("existing agent color NOT overwritten", async () => {
		const config = LuthierConfigSchema.parse({
			ux: { agents: { build: { color: "#7C3AED" } } },
		});
		const hook = createUxConfigHook(config);
		expect(hook).toBeDefined();
		const input = { agent: { build: { color: "#FF0000" } } } as Config;
		await hook?.(input);
		expect((input as Record<string, unknown>).agent).toMatchObject({ build: { color: "#FF0000" } });
	});

	it("keybinds merged when configured", async () => {
		const config = LuthierConfigSchema.parse({
			ux: { keybinds: { "ctrl+k": "clear" } },
		});
		const hook = createUxConfigHook(config);
		expect(hook).toBeDefined();
		const input = {} as Config;
		await hook?.(input);
		expect((input as Record<string, unknown>).keybinds).toBeDefined();
	});

	it("theme injected when configured", async () => {
		const config = LuthierConfigSchema.parse({
			ux: { theme: "dark" },
		});
		const hook = createUxConfigHook(config);
		expect(hook).toBeDefined();
		const input = {} as Config;
		await hook?.(input);
		expect((input as Record<string, unknown>).theme).toBe("dark");
	});
});
