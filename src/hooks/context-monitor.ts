import type { Hooks } from "@opencode-ai/plugin";
import type { LuthierConfig } from "../config/schema.js";
import { log, logVerbose } from "../shared/log.js";

/**
 * In-memory message counter per session.
 * Used to estimate context window usage without direct token counting.
 */
const sessionMessageCounts = new Map<string, number>();

/**
 * Default thresholds for context window warnings.
 */
const WARNING_THRESHOLD = 50;
const CRITICAL_THRESHOLD = 100;

/**
 * Creates a `chat.message` hook that tracks message count per session
 * and warns when approaching context window limits.
 *
 * This is a heuristic approach — we count messages as a proxy for
 * token usage since we don't have direct access to token counts.
 *
 * Warning levels:
 *   - 50+ messages: warning (consider compacting)
 *   - 100+ messages: critical (compaction strongly recommended)
 */
export function createContextMonitorHook(config: LuthierConfig): Hooks["chat.message"] {
	// Context monitoring is opt-in via experimental config
	const monitorConfig = config.experimental.context_monitor as
		| { enabled?: boolean; warning_threshold?: number; critical_threshold?: number }
		| undefined;

	if (!monitorConfig?.enabled) {
		return undefined;
	}

	const warnAt = monitorConfig.warning_threshold ?? WARNING_THRESHOLD;
	const critAt = monitorConfig.critical_threshold ?? CRITICAL_THRESHOLD;

	return async (input, output) => {
		const sessionId = input.sessionID;
		const count = (sessionMessageCounts.get(sessionId) ?? 0) + 1;
		sessionMessageCounts.set(sessionId, count);

		if (count === critAt) {
			log(`⚠ Context critical: ${count} messages in session ${sessionId}. Compaction strongly recommended.`);
			// Inject a context warning into the message parts
			const existingText = output.parts.find((p) => p.type === "text");
			if (existingText && "text" in existingText) {
				existingText.text = `[luthier: ⚠ ${count} messages in this session — context window may be near limit. Consider compacting.]\n\n${existingText.text}`;
			}
		} else if (count === warnAt) {
			log(`Context warning: ${count} messages in session ${sessionId}. Consider compacting soon.`);
		}

		logVerbose(`Context monitor: session ${sessionId} = ${count} messages`);
	};
}
