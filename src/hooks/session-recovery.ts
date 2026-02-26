import type { Hooks, PluginInput } from "@opencode-ai/plugin";
import type { LuthierConfig } from "../config/schema.js";
import { log, logVerbose } from "../shared/log.js";
import { SessionStore } from "../state/session-store.js";

/**
 * Creates an `experimental.chat.system.transform` hook that injects
 * recovery context when a session resumes after an interruption.
 *
 * Detects resumption by checking if a session was previously in "error"
 * or "idle" state (from the persistent store) and provides context
 * to help the agent understand what happened before the interruption.
 */
export function createSessionRecoveryHook(
	config: LuthierConfig,
	ctx: PluginInput,
): Hooks["experimental.chat.system.transform"] {
	if (!config.session_tracking.enabled) {
		return undefined;
	}

	const store = new SessionStore(ctx.directory);
	const recoveredSessions = new Set<string>();

	return async (input, output) => {
		const sessionId = input.sessionID;
		if (!sessionId || recoveredSessions.has(sessionId)) return;

		const record = store.getSession(sessionId);
		if (!record) return;

		// Only inject recovery context for sessions that were previously interrupted
		if (record.status === "error" || record.status === "idle") {
			const durationStr = record.durationSec > 0 ? `${record.durationSec.toFixed(1)}s` : "unknown";

			const recoveryContext = [
				"[luthier: Session Recovery Context]",
				`This session was previously ${record.status}.`,
				`Previous duration: ${durationStr}`,
				`Tool calls made: ${record.toolCalls}`,
				`Messages exchanged: ${record.messages}`,
				"If there were incomplete tasks, check the todo list and resume where you left off.",
			].join("\n");

			output.system.push(recoveryContext);
			recoveredSessions.add(sessionId);
			log(`Session recovery context injected for ${sessionId}`);
		}

		logVerbose(`Recovery check: session ${sessionId} status=${record.status}`);
	};
}
