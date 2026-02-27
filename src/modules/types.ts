import type { PluginInput } from "@opencode-ai/plugin";
import type { LuthierConfig } from "../config/schema.js";

/**
 * A prompt module contributes fragments to the assembled system prompt.
 * Each module encapsulates a specific behavior domain (orchestration, delegation, etc.)
 * and can be toggled on/off via config.modules.{name}.enabled.
 */
export interface PromptModule {
	/** Unique module identifier — maps to config.modules key. */
	name: string;
	/** Returns prompt fragments to inject into the system prompt. Empty array = no injection. */
	getPromptFragments(config: LuthierConfig, ctx: PluginInput): string[];
}
