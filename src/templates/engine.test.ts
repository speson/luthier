import { describe, expect, it } from "bun:test";
import { type TemplateContext, renderTemplate, resolvePath } from "./engine.js";

describe("resolvePath", () => {
	it("resolves top-level key", () => {
		expect(resolvePath({ name: "luthier" }, "name")).toBe("luthier");
	});

	it("resolves nested path", () => {
		const ctx = { config: { ux: { persona: { name: "Bot" } } } };
		expect(resolvePath(ctx, "config.ux.persona.name")).toBe("Bot");
	});

	it("returns undefined for missing path", () => {
		expect(resolvePath({ a: 1 }, "b")).toBeUndefined();
	});

	it("returns undefined for missing nested path", () => {
		expect(resolvePath({ a: { b: 1 } }, "a.c.d")).toBeUndefined();
	});

	it("returns undefined when traversing non-object", () => {
		expect(resolvePath({ a: "string" }, "a.b")).toBeUndefined();
	});

	it("returns undefined for null context", () => {
		expect(resolvePath({ a: null } as TemplateContext, "a.b")).toBeUndefined();
	});

	it("resolves arrays", () => {
		const ctx = { items: ["a", "b", "c"] };
		expect(resolvePath(ctx, "items")).toEqual(["a", "b", "c"]);
	});

	it("resolves boolean values", () => {
		expect(resolvePath({ enabled: true }, "enabled")).toBe(true);
		expect(resolvePath({ enabled: false }, "enabled")).toBe(false);
	});
});

describe("renderTemplate", () => {
	describe("variable interpolation", () => {
		it("replaces simple variable", () => {
			expect(renderTemplate("Hello {{name}}", { name: "World" })).toBe("Hello World");
		});

		it("replaces nested variable", () => {
			const ctx = { project: { name: "luthier" } };
			expect(renderTemplate("Project: {{project.name}}", ctx)).toBe("Project: luthier");
		});

		it("replaces multiple variables", () => {
			const ctx = { a: "1", b: "2" };
			expect(renderTemplate("{{a}} and {{b}}", ctx)).toBe("1 and 2");
		});

		it("replaces missing variable with empty string", () => {
			expect(renderTemplate("Hello {{missing}}", {})).toBe("Hello");
		});

		it("stringifies numbers", () => {
			expect(renderTemplate("Port: {{port}}", { port: 3000 })).toBe("Port: 3000");
		});

		it("stringifies booleans", () => {
			expect(renderTemplate("Enabled: {{enabled}}", { enabled: true })).toBe("Enabled: true");
		});

		it("JSON-stringifies objects", () => {
			const ctx = { data: { key: "value" } };
			expect(renderTemplate("Data: {{data}}", ctx)).toBe('Data: {"key":"value"}');
		});

		it("handles whitespace in variable name", () => {
			expect(renderTemplate("{{ name }}", { name: "test" })).toBe("test");
		});
	});

	describe("{{#if}} conditionals", () => {
		it("renders body when value is truthy", () => {
			const result = renderTemplate("{{#if enabled}}ON{{/if}}", { enabled: true });
			expect(result).toBe("ON");
		});

		it("hides body when value is falsy", () => {
			const result = renderTemplate("{{#if enabled}}ON{{/if}}", { enabled: false });
			expect(result).toBe("");
		});

		it("treats non-empty string as truthy", () => {
			const result = renderTemplate("{{#if name}}Hello {{name}}{{/if}}", { name: "Bob" });
			expect(result).toBe("Hello Bob");
		});

		it("treats empty string as falsy", () => {
			const result = renderTemplate("{{#if name}}Hello{{/if}}", { name: "" });
			expect(result).toBe("");
		});

		it("treats non-empty array as truthy", () => {
			const result = renderTemplate("{{#if items}}Has items{{/if}}", { items: [1] });
			expect(result).toBe("Has items");
		});

		it("treats empty array as falsy", () => {
			const result = renderTemplate("{{#if items}}Has items{{/if}}", { items: [] });
			expect(result).toBe("");
		});

		it("handles nested path in condition", () => {
			const ctx = { config: { modules: { orchestration: { enabled: true } } } };
			const result = renderTemplate("{{#if config.modules.orchestration.enabled}}Orchestration is ON{{/if}}", ctx);
			expect(result).toBe("Orchestration is ON");
		});

		it("handles missing path as falsy", () => {
			const result = renderTemplate("{{#if missing.path}}content{{/if}}", {});
			expect(result).toBe("");
		});

		it("handles nested if blocks", () => {
			const ctx = { a: true, b: true };
			const template = "{{#if a}}A{{#if b}}B{{/if}}{{/if}}";
			expect(renderTemplate(template, ctx)).toBe("AB");
		});

		it("handles nested if where inner is false", () => {
			const ctx = { a: true, b: false };
			const template = "{{#if a}}A{{#if b}}B{{/if}}{{/if}}";
			expect(renderTemplate(template, ctx)).toBe("A");
		});

		it("handles nested if where outer is false", () => {
			const ctx = { a: false, b: true };
			const template = "{{#if a}}A{{#if b}}B{{/if}}{{/if}}";
			expect(renderTemplate(template, ctx)).toBe("");
		});
	});

	describe("{{#unless}} conditionals", () => {
		it("renders body when value is falsy", () => {
			const result = renderTemplate("{{#unless enabled}}OFF{{/unless}}", { enabled: false });
			expect(result).toBe("OFF");
		});

		it("hides body when value is truthy", () => {
			const result = renderTemplate("{{#unless enabled}}OFF{{/unless}}", { enabled: true });
			expect(result).toBe("");
		});

		it("treats missing path as falsy (renders body)", () => {
			const result = renderTemplate("{{#unless missing}}Default{{/unless}}", {});
			expect(result).toBe("Default");
		});
	});

	describe("mixed content", () => {
		it("combines conditionals and variables", () => {
			const ctx = { name: "luthier", debug: true };
			const template = "Project: {{name}}\n{{#if debug}}Debug mode enabled{{/if}}";
			expect(renderTemplate(template, ctx)).toBe("Project: luthier\nDebug mode enabled");
		});

		it("renders realistic module template", () => {
			const ctx = {
				project: { name: "my-app" },
				config: {
					ux: { communication: { language: "Korean" } },
					modules: { orchestration: { enabled: true } },
				},
			};
			const template = [
				"# Rules for {{project.name}}",
				"",
				"{{#if config.ux.communication.language}}Always respond in {{config.ux.communication.language}}.{{/if}}",
				"",
				"{{#if config.modules.orchestration.enabled}}Use the orchestration workflow.{{/if}}",
			].join("\n");
			const result = renderTemplate(template, ctx);
			expect(result).toContain("Rules for my-app");
			expect(result).toContain("Always respond in Korean");
			expect(result).toContain("Use the orchestration workflow");
		});
	});

	describe("edge cases", () => {
		it("returns empty string for empty template", () => {
			expect(renderTemplate("", {})).toBe("");
		});

		it("returns plain text unchanged", () => {
			expect(renderTemplate("No variables here", {})).toBe("No variables here");
		});

		it("collapses excessive blank lines", () => {
			const template = "A\n\n\n\n\nB";
			expect(renderTemplate(template, {})).toBe("A\n\nB");
		});

		it("trims leading and trailing whitespace", () => {
			expect(renderTemplate("  Hello  ", {})).toBe("Hello");
		});

		it("handles null value gracefully", () => {
			expect(renderTemplate("{{val}}", { val: null } as unknown as TemplateContext)).toBe("");
		});
	});
});
