import type { Hooks, PluginInput } from "@opencode-ai/plugin";
import type { LuthierConfig } from "../config/schema.js";
import { logVerbose } from "../shared/log.js";
import { SessionStore } from "./session-store.js";

/**
 * Creates an event hook that persists session metrics to SQLite.
 *
 * Tracks:
 *   - Session start/idle/error transitions
 *   - Duration computation on idle
 *
 * This replaces the basic event-tracker for persistence-enabled configs.
 */
export function createMetricsEventHook(config: LuthierConfig, ctx: PluginInput): Hooks["event"] {
	if (!config.session_tracking.enabled) {
		return undefined;
	}

	const store = new SessionStore(ctx.directory);

	return async (input) => {
		const { event } = input;

		switch (event.type) {
			case "session.created": {
				const sessionId = (event.properties as Record<string, unknown>)?.id as string | undefined;
				if (sessionId) {
					store.upsertSession(sessionId);
					logVerbose(`Metrics: session started ${sessionId}`);
				}
				break;
			}

			case "session.idle": {
				const sessionId = (event.properties as Record<string, unknown>)?.sessionId as string | undefined;
				if (sessionId) {
					store.markIdle(sessionId);
					logVerbose(`Metrics: session idle ${sessionId}`);
				}
				break;
			}

			case "session.error": {
				const sessionId = (event.properties as Record<string, unknown>)?.sessionId as string | undefined;
				if (sessionId) {
					store.markError(sessionId);
					logVerbose(`Metrics: session error ${sessionId}`);
				}
				break;
			}
		}
	};
}

/**
 * Creates a `tool.execute.after` hook that counts tool calls per session.
 */
export function createMetricsToolHook(config: LuthierConfig, ctx: PluginInput): Hooks["tool.execute.after"] {
	if (!config.session_tracking.enabled) {
		return undefined;
	}

	const store = new SessionStore(ctx.directory);

	return async (input, _output) => {
		store.recordActivity(input.sessionID, "tool_call");
	};
}

/**
 * Creates a `chat.message` hook that counts messages per session.
 */
export function createMetricsMessageHook(config: LuthierConfig, ctx: PluginInput): Hooks["chat.message"] {
	if (!config.session_tracking.enabled) {
		return undefined;
	}

	const store = new SessionStore(ctx.directory);

	return async (input, _output) => {
		store.recordActivity(input.sessionID, "message");
	};
}
