import type { PluginInput } from "@opencode-ai/plugin";
import type { LuthierConfig } from "../config/schema.js";
import type { PromptModule } from "./types.js";

export function createDelegationModule(): PromptModule {
	return {
		name: "delegation",
		getPromptFragments(config: LuthierConfig, _ctx: PluginInput): string[] {
			if (!config.modules.delegation.enabled) return [];
			const fragments: string[] = [];

			// Build agent definitions based on enabled agents
			const agentDefs: string[] = [];
			if (config.modules.delegation.agents.explore) {
				agentDefs.push(
					"- **explore**: Contextual codebase search. Use for: 'Where is X?', 'Which file has Y?', 'Find code that does Z'. Fire multiple in parallel.",
				);
			}
			if (config.modules.delegation.agents.librarian) {
				agentDefs.push(
					"- **librarian**: Remote repo analysis and official docs retrieval. Use for: library APIs, GitHub examples, documentation lookup.",
				);
			}
			if (config.modules.delegation.agents.oracle) {
				agentDefs.push(
					"- **oracle**: Read-only high-IQ reasoning. Use for: debugging hard problems, architecture decisions, root cause analysis.",
				);
			}
			if (config.modules.delegation.agents.metis) {
				agentDefs.push(
					"- **metis**: Pre-planning consultant. Use for: identifying hidden intentions, ambiguities, and AI failure points before starting work.",
				);
			}
			if (config.modules.delegation.agents.momus) {
				agentDefs.push(
					"- **momus**: Expert reviewer. Use for: evaluating work plans against clarity, verifiability, and completeness standards.",
				);
			}

			if (agentDefs.length > 0) {
				fragments.push(`## Subagent Delegation\n\n### Available Agents\n${agentDefs.join("\n")}`);
			}

			// Delegation protocol
			fragments.push(
				"## Delegation Protocol\n- Use 6-section prompt structure: TASK, EXPECTED OUTCOME, REQUIRED TOOLS, MUST DO, MUST NOT DO, CONTEXT\n- Run independent agents in parallel (multiple task() calls in one message)\n- For failures: resume with session_id \u2014 never start fresh (preserves context, saves tokens)\n- Background agents: explore/librarian only. Task execution: always foreground",
			);

			return fragments;
		},
	};
}
