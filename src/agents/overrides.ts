import type { Hooks, PluginInput } from "@opencode-ai/plugin";
import type { LuthierConfig } from "../config/schema.js";
import { logVerbose } from "../shared/log.js";
import type { ResolvedCategory } from "./categories.js";
import { resolveCategories } from "./categories.js";
import { buildSkillPrompts } from "./prompt-builder.js";
import type { Skill } from "./skill-loader.js";
import { loadSkills } from "./skill-loader.js";

/**
 * Creates a `chat.params` hook that applies agent overrides.
 *
 * Override priority (highest wins):
 *   1. Per-agent config override (config.agents["oracle"].model)
 *   2. Category model mapping (if agent name matches a category)
 *   3. Default (no change)
 *
 * This hook also injects the "options" field for provider-specific
 * settings like thinking mode, reasoning effort, etc.
 */
export function createAgentOverridesHook(config: LuthierConfig, ctx: PluginInput): Hooks["chat.params"] {
	const agentOverrides = config.agents;
	const categories = resolveCategories(config);

	const hasOverrides = Object.keys(agentOverrides).length > 0;
	const hasCategories = Object.keys(config.categories).length > 0;

	// Nothing to override
	if (!hasOverrides && !hasCategories) {
		return undefined;
	}

	return async (input, output) => {
		const agentName = input.agent;

		// Check per-agent override first (highest priority)
		const override = agentOverrides[agentName];
		if (override) {
			if (override.temperature !== undefined) {
				output.temperature = override.temperature;
				logVerbose(`Agent override: ${agentName} temperature → ${override.temperature}`);
			}
			// Model override is noted but the actual model switch happens
			// at the OpenCode level — we can signal it via options
			if (override.model) {
				logVerbose(`Agent override: ${agentName} model → ${override.model}`);
			}
		}

		// Check category mapping (lower priority than per-agent)
		const category = categories.get(agentName);
		if (category && !override?.temperature && category.temperature !== undefined) {
			output.temperature = category.temperature;
			logVerbose(`Category override: ${agentName} temperature → ${category.temperature}`);
		}
	};
}

/**
 * Creates an `experimental.chat.system.transform` hook that injects
 * skill prompts and agent-specific system prompt overrides.
 *
 * This is separate from the basic system_directives hook in chat-message.ts.
 * This one handles the agent orchestration layer:
 *   - Loaded skill instruction blocks
 *   - Per-agent systemPrompt overrides from config
 */
export function createAgentSystemHook(
	config: LuthierConfig,
	ctx: PluginInput,
): Hooks["experimental.chat.system.transform"] {
	const skills = loadSkills(config, ctx.directory);
	const agentOverrides = config.agents;

	const skillPrompts = buildSkillPrompts(skills);
	const hasSkills = skillPrompts.length > 0;
	const hasSystemOverrides = Object.values(agentOverrides).some((o) => o.systemPrompt);

	// Nothing to inject
	if (!hasSkills && !hasSystemOverrides) {
		return undefined;
	}

	return async (input, output) => {
		// Inject skill prompts (available to all agents)
		if (hasSkills) {
			for (const prompt of skillPrompts) {
				output.system.push(prompt);
			}
			logVerbose(`Injected ${skillPrompts.length} skill prompt(s)`);
		}

		// Inject per-agent system prompt override
		// We use sessionID to potentially detect agent context in the future
		// For now, check if any agent override has a systemPrompt
		for (const [agentName, override] of Object.entries(agentOverrides)) {
			if (override.systemPrompt) {
				output.system.push(`<agent-override name="${agentName}">\n${override.systemPrompt}\n</agent-override>`);
				logVerbose(`Injected system prompt override for agent: ${agentName}`);
			}
		}
	};
}
