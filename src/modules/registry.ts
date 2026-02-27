import type { LuthierConfig } from "../config/schema.js";
import { createDelegationModule } from "./delegation.js";
import { createFailureRecoveryModule } from "./failure-recovery.js";
import { createOrchestrationModule } from "./orchestration.js";
import { createQualityRulesModule } from "./quality-rules.js";
import type { PromptModule } from "./types.js";
import { createWorkflowModule } from "./workflow.js";

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
 * Returns all prompt modules that are enabled in the current config.
 * Modules are returned in canonical order: orchestration → delegation → quality-rules → workflow → failure-recovery.
 * This order matches the assembler's injection sequence.
 */
export function getEnabledModules(config: LuthierConfig): PromptModule[] {
	return MODULE_ENTRIES.filter((entry) => entry.isEnabled(config)).map((entry) => entry.createModule());
}
