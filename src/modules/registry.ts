import type { LuthierConfig } from "../config/schema.js";
import type { CustomModule } from "./custom-loader.js";
import { toPromptModule } from "./custom-loader.js";
import { createDelegationModule } from "./delegation.js";
import { createFailureRecoveryModule } from "./failure-recovery.js";
import { createOrchestrationModule } from "./orchestration.js";
import { createQualityRulesModule } from "./quality-rules.js";
import type { PromptModule } from "./types.js";
import { createWorkflowModule } from "./workflow.js";

/**
 * All built-in prompt module descriptors, mapping config keys to module names.
 */
const BUILTIN_MODULE_ENTRIES: Array<{
	name: string;
	isEnabled: (config: LuthierConfig) => boolean;
	createModule: () => PromptModule;
}> = [
	{
		name: "orchestration",
		isEnabled: (config) => config.modules.orchestration.enabled,
		createModule: () => createOrchestrationModule(),
	},
	{
		name: "delegation",
		isEnabled: (config) => config.modules.delegation.enabled,
		createModule: () => createDelegationModule(),
	},
	{
		name: "quality-rules",
		isEnabled: (config) => config.modules.quality.enabled,
		createModule: () => createQualityRulesModule(),
	},
	{
		name: "workflow",
		isEnabled: (config) => config.modules.workflow.enabled,
		createModule: () => createWorkflowModule(),
	},
	{
		name: "failure-recovery",
		isEnabled: (config) => config.modules.failure_recovery.enabled,
		createModule: () => createFailureRecoveryModule(),
	},
];

/**
 * Returns all enabled built-in prompt modules.
 * Modules are returned in canonical order: orchestration → delegation → quality-rules → workflow → failure-recovery.
 */
export function getEnabledModules(config: LuthierConfig): PromptModule[] {
	return BUILTIN_MODULE_ENTRIES.filter((entry) => entry.isEnabled(config)).map((entry) => entry.createModule());
}

/**
 * Returns all enabled modules — built-in first (canonical order), then custom (sorted by priority).
 * Custom modules are appended after built-in modules.
 */
export function getAllEnabledModules(config: LuthierConfig, customModules: CustomModule[]): PromptModule[] {
	const builtins = getEnabledModules(config);
	const customs = customModules.map((mod) => toPromptModule(mod));
	return [...builtins, ...customs];
}
