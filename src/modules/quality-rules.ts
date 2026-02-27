import type { PluginInput } from "@opencode-ai/plugin";
import type { LuthierConfig } from "../config/schema.js";
import type { PromptModule } from "./types.js";

export function createQualityRulesModule(): PromptModule {
	return {
		name: "quality-rules",
		getPromptFragments(config: LuthierConfig, _ctx: PluginInput): string[] {
			if (!config.modules.quality.enabled) return [];
			const fragments: string[] = [];

			if (config.modules.quality.type_safety) {
				fragments.push(
					"## Quality: Type Safety\n- Never use `as any` or `@ts-ignore` — fix the type properly\n- If a type is genuinely unknown, use `unknown` and narrow it\n- Type assertions require a comment explaining why they are safe",
				);
			}
			if (config.modules.quality.empty_catch) {
				fragments.push(
					"## Quality: Error Handling\n- Never leave an empty catch block — at minimum log the error\n- Do not swallow errors silently\n- Fail fast: surface errors early rather than hiding them",
				);
			}
			if (config.modules.quality.test_integrity) {
				fragments.push(
					"## Quality: Test Integrity\n- Never delete or skip failing tests — fix the code instead\n- Read before write: understand existing tests before modifying\n- Run lint/typecheck after every change: `tsc --noEmit && biome check src/`",
				);
			}

			return fragments;
		},
	};
}
