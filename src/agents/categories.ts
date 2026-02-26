import type { CategoryConfig, LuthierConfig } from "../config/schema.js";

/**
 * A resolved category — default + user overrides merged.
 */
export interface ResolvedCategory {
	name: string;
	model?: string;
	temperature?: number;
	description: string;
}

/**
 * Default categories — mirrors oh-my-opencode's category system.
 *
 * Categories map task types to model selections. Users can override
 * any default or add entirely new categories via config.
 */
const DEFAULT_CATEGORIES: Record<string, CategoryConfig> = {
	quick: {
		description: "Trivial tasks — single file changes, typo fixes, simple modifications",
	},
	"visual-engineering": {
		description: "Frontend, UI/UX, design, styling, animation",
	},
	ultrabrain: {
		description: "Genuinely hard, logic-heavy tasks requiring deep reasoning",
	},
	deep: {
		description: "Goal-oriented autonomous problem-solving requiring thorough research",
	},
	artistry: {
		description: "Complex problem-solving with unconventional, creative approaches",
	},
	"unspecified-low": {
		description: "Tasks that don't fit other categories, low effort required",
	},
	"unspecified-high": {
		description: "Tasks that don't fit other categories, high effort required",
	},
	writing: {
		description: "Documentation, prose, technical writing",
	},
};

/**
 * Resolve all categories: merge defaults with user-defined categories.
 * User entries override defaults for the same key.
 */
export function resolveCategories(config: LuthierConfig): Map<string, ResolvedCategory> {
	const result = new Map<string, ResolvedCategory>();

	// Apply defaults
	for (const [name, cat] of Object.entries(DEFAULT_CATEGORIES)) {
		result.set(name, {
			name,
			model: cat.model,
			temperature: cat.temperature,
			description: cat.description ?? name,
		});
	}

	// Apply user overrides (can override defaults or add new)
	for (const [name, cat] of Object.entries(config.categories)) {
		const existing = result.get(name);
		result.set(name, {
			name,
			model: cat.model ?? existing?.model,
			temperature: cat.temperature ?? existing?.temperature,
			description: cat.description ?? existing?.description ?? name,
		});
	}

	return result;
}

/**
 * Find a category by name. Returns undefined if not found.
 */
export function getCategory(categories: Map<string, ResolvedCategory>, name: string): ResolvedCategory | undefined {
	return categories.get(name);
}
