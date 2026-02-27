import type { Hooks, PluginInput } from "@opencode-ai/plugin";
import type { LuthierConfig } from "../config/schema.js";
import { logVerbose } from "../shared/log.js";
import { buildTemplateContext } from "../templates/context.js";
import { type TemplateContext, renderTemplate } from "../templates/engine.js";
import { buildCommunicationPrompt } from "../ux/communication.js";
import { buildPersonaPrompt } from "../ux/persona.js";
import { resolveUxConfig } from "../ux/presets.js";
import { loadCustomModules } from "./custom-loader.js";
import { getAllEnabledModules } from "./registry.js";

/**
 * Optionally render a fragment through the template engine.
 * When templates are disabled, returns the fragment as-is.
 */
function maybeRender(fragment: string, templatesEnabled: boolean, templateContext: TemplateContext): string {
	if (!templatesEnabled) return fragment;
	if (!fragment.includes("{{")) return fragment;
	return renderTemplate(fragment, templateContext);
}

/**
 * Creates an `experimental.chat.system.transform` hook that assembles
 * prompt fragments from UX configuration, built-in modules, and custom modules.
 *
 * Injection order:
 *   1. Persona fragment (if configured)
 *   2. Communication fragment (if configured)
 *   3. Built-in module fragments (canonical order)
 *   4. Custom module fragments (sorted by priority)
 *
 * Template rendering is applied to all fragments when modules.templates_enabled is true.
 * Returns undefined if no fragments to inject (no-op optimization).
 */
export function createPromptAssemblerHook(
	config: LuthierConfig,
	ctx: PluginInput,
): Hooks["experimental.chat.system.transform"] | undefined {
	const resolvedUx = resolveUxConfig(config);
	const templatesEnabled = config.modules.templates_enabled;
	const templateContext = buildTemplateContext(config, ctx);

	const personaFragment = buildPersonaPrompt(resolvedUx);
	const communicationFragment = buildCommunicationPrompt(resolvedUx);

	const customModules = loadCustomModules(config, ctx.directory);

	const allModules = getAllEnabledModules(config, customModules);

	const moduleFragments: string[] = [];
	for (const module of allModules) {
		const fragments = module.getPromptFragments({ ...config, ux: resolvedUx }, ctx);
		moduleFragments.push(...fragments);
	}

	const hasPersona = personaFragment.length > 0;
	const hasCommunication = communicationFragment.length > 0;
	const hasModules = moduleFragments.length > 0;

	if (!hasPersona && !hasCommunication && !hasModules) {
		return undefined;
	}

	return async (_input, output) => {
		const injectedFragments: string[] = [];

		if (hasPersona) {
			output.system.push(maybeRender(personaFragment, templatesEnabled, templateContext));
			injectedFragments.push("persona");
		}

		if (hasCommunication) {
			output.system.push(maybeRender(communicationFragment, templatesEnabled, templateContext));
			injectedFragments.push("communication");
		}

		if (hasModules) {
			for (const fragment of moduleFragments) {
				if (fragment.length > 0) {
					output.system.push(maybeRender(fragment, templatesEnabled, templateContext));
				}
			}
			injectedFragments.push(`modules (${moduleFragments.length} fragments)`);
		}

		logVerbose(`Assembled prompt fragments: ${injectedFragments.join(", ")}`);
	};
}
