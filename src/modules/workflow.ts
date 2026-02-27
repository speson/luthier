import type { PluginInput } from "@opencode-ai/plugin";
import type { LuthierConfig } from "../config/schema.js";
import type { PromptModule } from "./types.js";

export function createWorkflowModule(): PromptModule {
	return {
		name: "workflow",
		getPromptFragments(config: LuthierConfig, _ctx: PluginInput): string[] {
			if (!config.modules.workflow.enabled) return [];
			const fragments: string[] = [];

			if (config.modules.workflow.todo_management) {
				fragments.push(
					"## Workflow: Todo Management\n- Use TodoWrite to track all tasks before starting\n- Mark tasks in_progress when working, completed immediately when done\n- Only one task in_progress at a time\n- Do not batch completions — mark done immediately after finishing",
				);
			}
			if (config.modules.workflow.todo_continuation) {
				fragments.push(
					"## Workflow: Todo Continuation\n- Never stop with incomplete todos — continue until all tasks are done\n- If blocked, document the blocker and move to the next independent task\n- Do not ask for permission to continue — keep working",
				);
			}
			if (config.modules.workflow.verification) {
				fragments.push(
					"## Workflow: Verification\n- After every code change: run `tsc --noEmit` and `biome check src/`\n- After adding tests: run `bun test` to confirm they pass\n- Do not claim a task complete without running verification commands",
				);
			}
			if (config.modules.workflow.evidence_required) {
				fragments.push(
					"## Workflow: Evidence Required\n- Before marking any task done, provide evidence: command output, test results, or file contents\n- 'It should work' is not evidence — run it and show the output\n- Save evidence to .sisyphus/evidence/ when applicable",
				);
			}

			return fragments;
		},
	};
}
