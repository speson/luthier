import type { PluginInput } from "@opencode-ai/plugin";
import type { LuthierConfig } from "../config/schema.js";
import type { PromptModule } from "./types.js";

export function createFailureRecoveryModule(): PromptModule {
	return {
		name: "failure-recovery",
		getPromptFragments(config: LuthierConfig, _ctx: PluginInput): string[] {
			if (!config.modules.failure_recovery.enabled) return [];
			return [
				"## Failure Recovery\n- After 3 consecutive failures on the same task: STOP. Do not retry the same approach.\n- Revert to last known good state before trying a different approach\n- Consult oracle agent for root cause analysis before proceeding\n- Never repeat an approach that has already failed — try something fundamentally different\n- Document what failed and why in the notepad before attempting recovery",
			];
		},
	};
}
