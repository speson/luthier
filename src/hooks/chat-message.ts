import type { Hooks } from "@opencode-ai/plugin";
import type { LuthierConfig } from "../config/schema.js";
import { logVerbose } from "../shared/log.js";

/**
 * Creates a `chat.message` hook that injects contextual metadata
 * into user messages when `inject_context` is enabled.
 *
 * Injects context by modifying the existing message's system field,
 * making the AI aware of temporal/session context.
 */
export function createChatMessageHook(config: LuthierConfig): Hooks["chat.message"] {
	const hookConfig = config.hooks["chat-message"];

	if (!hookConfig.inject_context) {
		return undefined;
	}

	return async (input, output) => {
		const now = new Date();
		const timestamp = now.toLocaleString("en-US", {
			weekday: "short",
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
			timeZoneName: "short",
		});

		// Inject context as metadata on the message
		const contextText = `[luthier context] Time: ${timestamp} | Session: ${input.sessionID}`;

		// Find existing text parts and prepend context, or modify message metadata
		const firstTextPart = output.parts.find((p) => p.type === "text");
		if (firstTextPart && "text" in firstTextPart) {
			firstTextPart.text = `${contextText}\n\n${firstTextPart.text}`;
		}

		logVerbose(`Injected context into message for session ${input.sessionID}`);
	};
}

/**
 * Creates an `experimental.chat.system.transform` hook that appends
 * user-defined system directives to the system prompt.
 *
 * Example directives:
 *   - "Always respond in Korean"
 *   - "Prefer functional programming patterns"
 *   - "Include JSDoc comments on all exported functions"
 */
export function createSystemTransformHook(config: LuthierConfig): Hooks["experimental.chat.system.transform"] {
	const hookConfig = config.hooks["chat-message"];
	const { system_directives } = hookConfig;

	if (system_directives.length === 0) {
		return undefined;
	}

	return async (_input, output) => {
		for (const directive of system_directives) {
			output.system.push(directive);
		}

		logVerbose(`Injected ${system_directives.length} system directive(s)`);
	};
}
