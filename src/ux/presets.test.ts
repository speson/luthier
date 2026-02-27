import { describe, expect, it } from "bun:test";
import { LuthierConfigSchema } from "../config/schema.js";
import { resolveUxConfig } from "./presets.js";

describe("resolveUxConfig", () => {
	it("default preset produces Sisyphus persona", () => {
		const config = LuthierConfigSchema.parse({});
		const resolved = resolveUxConfig(config);
		expect(resolved.persona.name).toBe("Sisyphus");
	});

	it("user override wins over preset value", () => {
		const config = LuthierConfigSchema.parse({
			ux: { preset: "default", persona: { name: "MyBot" } },
		});
		const resolved = resolveUxConfig(config);
		expect(resolved.persona.name).toBe("MyBot");
	});

	it("minimal preset has terse tone", () => {
		const config = LuthierConfigSchema.parse({ ux: { preset: "minimal" } });
		const resolved = resolveUxConfig(config);
		expect(resolved.communication.tone).toBe("terse");
	});

	it("verbose preset has detailed verbosity", () => {
		const config = LuthierConfigSchema.parse({ ux: { preset: "verbose" } });
		const resolved = resolveUxConfig(config);
		expect(resolved.communication.verbosity).toBe("detailed");
	});

	it("pair-buddy preset has casual tone", () => {
		const config = LuthierConfigSchema.parse({ ux: { preset: "pair-buddy" } });
		const resolved = resolveUxConfig(config);
		expect(resolved.communication.tone).toBe("casual");
	});

	it("user communication.tone overrides preset tone", () => {
		const config = LuthierConfigSchema.parse({
			ux: { preset: "verbose", communication: { tone: "casual" } },
		});
		const resolved = resolveUxConfig(config);
		expect(resolved.communication.tone).toBe("casual");
	});
});
