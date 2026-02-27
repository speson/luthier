import type { Hooks, PluginInput } from "@opencode-ai/plugin";
import type { LuthierConfig } from "../config/schema.js";
import { logVerbose } from "../shared/log.js";
import { buildCommunicationPrompt } from "../ux/communication.js";
import { buildPersonaPrompt } from "../ux/persona.js";
import { resolveUxConfig } from "../ux/presets.js";
import { getEnabledModules } from "./registry.js";

/**
 * Creates an `experimental.chat.system.transform` hook that assembles
 * prompt fragments from UX configuration and enabled modules.
 *
 * Injection order:
 *   1. Persona fragment (if configured)
 *   2. Communication fragment (if configured)
 *   3. Module fragments (in registry order: orchestration → delegation → quality-rules → workflow → failure-recovery)
 *
 * Returns undefined if no fragments to inject (no-op optimization).
 */
export function createPromptAssemblerHook(
	config: LuthierConfig,
	ctx: PluginInput,
): Hooks["experimental.chat.system.transform"] | undefined {
	// Resolve UX configuration from presets and user overrides
	const resolvedUx = resolveUxConfig(config);

	// Build persona and communication fragments
	const personaFragment = buildPersonaPrompt(resolvedUx);
	const communicationFragment = buildCommunicationPrompt(resolvedUx);

	// Get enabled modules in canonical order
	const enabledModules = getEnabledModules(config);

	// Collect module fragments
	const moduleFragments: string[] = [];
	for (const module of enabledModules) {
		const fragments = module.getPromptFragments({ ...config, ux: resolvedUx }, ctx);
		moduleFragments.push(...fragments);
	}

	// Determine if we have anything to inject
	const hasPersona = personaFragment.length > 0;
	const hasCommunication = communicationFragment.length > 0;
	const hasModules = moduleFragments.length > 0;

	if (!hasPersona && !hasCommunication && !hasModules) {
		return undefined;
	}

	// Return the hook that injects fragments in order
	return async (_input, output) => {
		const injectedFragments: string[] = [];

		if (hasPersona) {
			output.system.push(personaFragment);
			injectedFragments.push("persona");
		}

		if (hasCommunication) {
			output.system.push(communicationFragment);
			injectedFragments.push("communication");
		}

		if (hasModules) {
			for (const fragment of moduleFragments) {
				if (fragment.length > 0) {
					output.system.push(fragment);
				}
			}
			injectedFragments.push(`modules (${moduleFragments.length} fragments)`);
		}

		logVerbose(`Assembled prompt fragments: ${injectedFragments.join(", ")}`);
	};
}
