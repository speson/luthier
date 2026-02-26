import type { Hooks, PluginInput } from "@opencode-ai/plugin";
import type { LuthierConfig } from "../config/schema.js";
import { logVerbose } from "../shared/log.js";

/**
 * Creates an event hook that shows toast notifications for session events.
 *
 * Uses `client.tui.showToast()` from the OpenCode SDK to display
 * non-intrusive notifications in the TUI.
 *
 * Configurable:
 *   - `tui.toast.enabled` — toggle toasts on/off
 *   - `tui.toast.duration` — display duration in ms
 */
export function createToastHook(config: LuthierConfig, ctx: PluginInput): Hooks["event"] {
	const toastConfig = config.tui.toast;

	if (!toastConfig.enabled) {
		return undefined;
	}

	const prefix = config.tui.theme.prefix;

	return async (input) => {
		const { event } = input;

		let message: string | undefined;

		switch (event.type) {
			case "session.created":
				message = `${prefix} Session started`;
				break;
			case "session.idle":
				message = `${prefix} Session idle`;
				break;
			case "session.error":
				message = `${prefix} Session error`;
				break;
			case "session.compacted":
				message = `${prefix} Session compacted`;
				break;
		}

		if (message) {
			try {
				await ctx.client.app.log({
					body: {
						service: "luthier",
						level: "info",
						message,
					},
				});
				logVerbose(`Toast: ${message}`);
			} catch {
				logVerbose(`Toast failed (TUI may not be available): ${message}`);
			}
		}
	};
}
