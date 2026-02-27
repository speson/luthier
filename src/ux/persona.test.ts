import { describe, expect, it } from "bun:test";
import { LuthierConfigSchema } from "../config/schema.js";
import { buildPersonaPrompt } from "./persona.js";
import { resolveUxConfig } from "./presets.js";

describe("buildPersonaPrompt", () => {
	it("empty config returns empty string", () => {
		const config = LuthierConfigSchema.parse({ ux: { preset: "minimal" } });
		const ux = resolveUxConfig(config);
		expect(buildPersonaPrompt(ux)).toBe("");
	});

	it("name only produces prompt with name", () => {
		const config = LuthierConfigSchema.parse({
			ux: { preset: "minimal", persona: { name: "Atlas" } },
		});
		const ux = resolveUxConfig(config);
		const prompt = buildPersonaPrompt(ux);
		expect(prompt).toContain("Atlas");
	});

	it("name + role + traits produces full prompt", () => {
		const config = LuthierConfigSchema.parse({
			ux: {
				preset: "minimal",
				persona: { name: "Atlas", role: "orchestrator", traits: ["methodical", "precise"] },
			},
		});
		const ux = resolveUxConfig(config);
		const prompt = buildPersonaPrompt(ux);
		expect(prompt).toContain("Atlas");
		expect(prompt).toContain("orchestrator");
		expect(prompt).toContain("methodical");
	});

	it("traits array included in output", () => {
		const config = LuthierConfigSchema.parse({
			ux: { preset: "minimal", persona: { name: "X", traits: ["fast", "reliable"] } },
		});
		const ux = resolveUxConfig(config);
		const prompt = buildPersonaPrompt(ux);
		expect(prompt).toContain("fast");
		expect(prompt).toContain("reliable");
	});

	it("default preset produces non-empty prompt (Sisyphus)", () => {
		const config = LuthierConfigSchema.parse({});
		const ux = resolveUxConfig(config);
		const prompt = buildPersonaPrompt(ux);
		expect(prompt.length).toBeGreaterThan(0);
		expect(prompt).toContain("Sisyphus");
	});
});
