import type { Hooks } from "@opencode-ai/plugin";
import type { LuthierConfig } from "../config/schema.js";
import { logVerbose } from "../shared/log.js";

/**
 * Creates a `config` hook that injects UX visual settings
 * (theme, agent colors, keybinds, username, tui, custom commands)
 * into OpenCode's configuration. Only injects values where the
 * existing OpenCode config value is null/undefined/empty.
 */
export function createUxConfigHook(config: LuthierConfig): Hooks["config"] {
	const ux = config.ux;

	// Return undefined if there's nothing to inject (optimization)
	const hasAnything =
		!!ux.theme ||
		!!ux.username ||
		Object.keys(ux.agents).length > 0 ||
		Object.keys(ux.keybinds).length > 0 ||
		Object.keys(ux.tui).some((k) => (ux.tui as Record<string, unknown>)[k] !== undefined) ||
		ux.commands.length > 0;
	if (!hasAnything) return undefined;

	return async (input) => {
		// Inject theme (only if not already set)
		if (ux.theme && !input.theme) {
			input.theme = ux.theme;
			logVerbose(`UX: theme set to ${ux.theme}`);
		}

		// Inject username
		if (ux.username && !input.username) {
			// biome-ignore lint/suspicious/noExplicitAny: OpenCode Config username field
			(input as any).username = ux.username;
		}

		// Inject agent colors
		for (const [agentName, agentConfig] of Object.entries(ux.agents)) {
			if (agentConfig.color) {
				// biome-ignore lint/suspicious/noExplicitAny: OpenCode Config agent map has heterogeneous shape
				if (!input.agent) (input as any).agent = {};
				// biome-ignore lint/suspicious/noExplicitAny: OpenCode Config agent color field
				const existing = (input as any).agent[agentName];
				if (!existing?.color) {
					// biome-ignore lint/suspicious/noExplicitAny: OpenCode AgentConfig.color field
					(input as any).agent[agentName] = { ...(existing ?? {}), color: agentConfig.color };
					logVerbose(`UX: agent ${agentName} color set to ${agentConfig.color}`);
				}
			}
		}

		// Inject keybinds
		for (const [key, value] of Object.entries(ux.keybinds)) {
			// biome-ignore lint/suspicious/noExplicitAny: OpenCode KeybindsConfig has many named fields
			if (!(input as any).keybinds?.[key]) {
				// biome-ignore lint/suspicious/noExplicitAny: KeybindsConfig mutation
				if (!input.keybinds) (input as any).keybinds = {};
				// biome-ignore lint/suspicious/noExplicitAny: KeybindsConfig mutation
				(input as any).keybinds[key] = value;
			}
		}

		// Inject tui settings
		if (
			ux.tui.scroll_speed !== undefined ||
			ux.tui.scroll_acceleration !== undefined ||
			ux.tui.diff_style !== undefined
		) {
			// biome-ignore lint/suspicious/noExplicitAny: OpenCode Config tui field
			if (!input.tui) (input as any).tui = {};
			// biome-ignore lint/suspicious/noExplicitAny: tui scroll_speed check
			if (ux.tui.scroll_speed !== undefined && !(input as any).tui?.scroll_speed) {
				// biome-ignore lint/suspicious/noExplicitAny: tui scroll_speed
				(input as any).tui.scroll_speed = ux.tui.scroll_speed;
			}
			// biome-ignore lint/suspicious/noExplicitAny: tui scroll_acceleration check
			if (ux.tui.scroll_acceleration !== undefined && !(input as any).tui?.scroll_acceleration) {
				// biome-ignore lint/suspicious/noExplicitAny: tui scroll_acceleration
				(input as any).tui.scroll_acceleration = ux.tui.scroll_acceleration;
			}
			// biome-ignore lint/suspicious/noExplicitAny: tui diff_style check
			if (ux.tui.diff_style !== undefined && !(input as any).tui?.diff_style) {
				// biome-ignore lint/suspicious/noExplicitAny: tui diff_style
				(input as any).tui.diff_style = ux.tui.diff_style;
			}
		}

		// Inject custom commands
		for (const cmd of ux.commands) {
			// biome-ignore lint/suspicious/noExplicitAny: OpenCode Config command map
			if (!input.command) (input as any).command = {};
			// biome-ignore lint/suspicious/noExplicitAny: Config.command record
			if (!(input as any).command[cmd.name]) {
				// biome-ignore lint/suspicious/noExplicitAny: Config.command record
				(input as any).command[cmd.name] = {
					description: cmd.description ?? cmd.name,
					run: cmd.command,
				};
				logVerbose(`UX: command ${cmd.name} registered`);
			}
		}
	};
}
