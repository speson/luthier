import { describe, expect, it } from "bun:test";
import { LuthierConfigSchema } from "../config/schema.js";
import { getCategory, resolveCategories } from "./categories.js";

describe("resolveCategories", () => {
	it("returns all 8 default categories with empty config", () => {
		const config = LuthierConfigSchema.parse({});
		const categories = resolveCategories(config);
		expect(categories.size).toBe(8);
		expect(categories.has("quick")).toBe(true);
		expect(categories.has("deep")).toBe(true);
		expect(categories.has("ultrabrain")).toBe(true);
		expect(categories.has("visual-engineering")).toBe(true);
		expect(categories.has("artistry")).toBe(true);
		expect(categories.has("unspecified-low")).toBe(true);
		expect(categories.has("unspecified-high")).toBe(true);
		expect(categories.has("writing")).toBe(true);
	});

	it("default categories have descriptions", () => {
		const config = LuthierConfigSchema.parse({});
		const categories = resolveCategories(config);
		const quick = categories.get("quick");
		expect(quick).toBeDefined();
		expect(quick?.description).toContain("Trivial");
		expect(quick?.name).toBe("quick");
	});

	it("user can override existing category model", () => {
		const config = LuthierConfigSchema.parse({
			categories: {
				deep: { model: "gpt-4o", temperature: 0.2 },
			},
		});
		const categories = resolveCategories(config);
		const deep = categories.get("deep");
		expect(deep).toBeDefined();
		expect(deep?.model).toBe("gpt-4o");
		expect(deep?.temperature).toBe(0.2);
		// Original description preserved
		expect(deep?.description).toContain("problem-solving");
	});

	it("user can override existing category description", () => {
		const config = LuthierConfigSchema.parse({
			categories: {
				quick: { description: "My custom quick" },
			},
		});
		const categories = resolveCategories(config);
		expect(categories.get("quick")?.description).toBe("My custom quick");
	});

	it("user can add custom categories", () => {
		const config = LuthierConfigSchema.parse({
			categories: {
				"data-analysis": {
					model: "gpt-4o",
					description: "Data analysis tasks",
				},
			},
		});
		const categories = resolveCategories(config);
		expect(categories.size).toBe(9);
		expect(categories.has("data-analysis")).toBe(true);
		expect(categories.get("data-analysis")?.model).toBe("gpt-4o");
	});

	it("default categories have no model set", () => {
		const config = LuthierConfigSchema.parse({});
		const categories = resolveCategories(config);
		const quick = categories.get("quick");
		expect(quick?.model).toBeUndefined();
	});
});

describe("getCategory", () => {
	it("returns category by name", () => {
		const config = LuthierConfigSchema.parse({});
		const categories = resolveCategories(config);
		const result = getCategory(categories, "deep");
		expect(result).toBeDefined();
		expect(result?.name).toBe("deep");
	});

	it("returns undefined for non-existent category", () => {
		const config = LuthierConfigSchema.parse({});
		const categories = resolveCategories(config);
		const result = getCategory(categories, "nonexistent");
		expect(result).toBeUndefined();
	});
});
