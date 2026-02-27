import type { LuthierConfig } from "../config/schema.js";
import type { PromptModule } from "./types.js";

/**
 * All prompt module descriptors, mapping config keys to module names.
 * Actual implementations are lazy-loaded and will be registered here in Wave 3.
 */
const MODULE_ENTRIES: Array<{
	name: string;
	isEnabled: (config: LuthierConfig) => boolean;
	createModule: () => PromptModule;
}> = [
	{
		name: "orchestration",
		isEnabled: (config) => config.modules.orchestration.enabled,
		createModule: () => ({
			name: "orchestration",
			getPromptFragments: () => [],
		}),
	},
	{
		name: "delegation",
		isEnabled: (config) => config.modules.delegation.enabled,
		createModule: () => ({
			name: "delegation",
			getPromptFragments: () => [],
		}),
	},
	{
		name: "quality-rules",
		isEnabled: (config) => config.modules.quality.enabled,
		createModule: () => ({
			name: "quality-rules",
			getPromptFragments: () => [],
		}),
	},
	{
		name: "workflow",
		isEnabled: (config) => config.modules.workflow.enabled,
		createModule: () => ({
			name: "workflow",
			getPromptFragments: () => [],
		}),
	},
	{
		name: "failure-recovery",
		isEnabled: (config) => config.modules.failure_recovery.enabled,
		createModule: () => ({
			name: "failure-recovery",
			getPromptFragments: () => [],
		}),
	},
];

/**
 * Returns all prompt modules that are enabled in the current config.
 * Modules are returned in canonical order: orchestration → delegation → quality-rules → workflow → failure-recovery.
 * This order matches the assembler's injection sequence.
 */
export function getEnabledModules(config: LuthierConfig): PromptModule[] {
	return MODULE_ENTRIES.filter((entry) => entry.isEnabled(config)).map((entry) => entry.createModule());
}
