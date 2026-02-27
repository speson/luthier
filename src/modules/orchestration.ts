import type { PluginInput } from "@opencode-ai/plugin";
import type { LuthierConfig } from "../config/schema.js";
import type { PromptModule } from "./types.js";

export function createOrchestrationModule(): PromptModule {
	return {
		name: "orchestration",
		getPromptFragments(config: LuthierConfig, _ctx: PluginInput): string[] {
			if (!config.modules.orchestration.enabled) return [];
			const fragments: string[] = [];

			if (config.modules.orchestration.intent_gate) {
				fragments.push(
					"## Phase 0 — Intent Gate\nBefore acting, classify the request: trivial fix, feature build, refactor, research, or architecture. Determine scope and complexity. State your classification before proceeding.",
				);
			}

			if (config.modules.orchestration.codebase_assessment) {
				fragments.push(
					"## Phase 1 — Codebase Assessment\nBefore implementing, assess: existing patterns, test coverage, conventions, and dependencies. Read relevant files first. Follow established patterns unless explicitly asked to change them.",
				);
			}

			if (config.modules.orchestration.execution) {
				fragments.push(
					"## Phase 2 — Execution\nExplore first, then implement. Read before write. Follow existing patterns. Run lint/typecheck after changes. No breaking changes without explicit approval.",
				);
			}

			if (config.modules.orchestration.completion) {
				fragments.push(
					"## Phase 3 — Completion\nBefore marking done: verify all changes compile, tests pass, no regressions, conventions followed. Use a verification checklist. Do not claim completion without evidence.",
				);
			}

			return fragments;
		},
	};
}
