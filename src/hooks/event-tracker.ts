import type { LuthierConfig } from "../config/schema.js";
import { log, logVerbose, setLogLevel } from "../shared/log.js";

interface EventInput {
	event: {
		type: string;
		properties?: Record<string, unknown>;
	};
}

/**
 * Creates an event hook that tracks session lifecycle events.
 *
 * Respects the `session_tracking` config:
 * - `enabled`: whether to track at all
 * - `logLevel`: "silent" | "minimal" | "verbose"
 *
 * Tracked events:
 * - session.created — new session started
 * - session.idle — agent finished responding
 * - session.error — session error occurred
 */
export function createEventHook(config: LuthierConfig) {
	const trackingConfig = config.session_tracking;

	if (!trackingConfig.enabled) {
		return async (_input: EventInput): Promise<void> => {
			// Tracking disabled — no-op
		};
	}

	setLogLevel(trackingConfig.logLevel);

	const sessionStartTimes = new Map<string, number>();

	return async (input: EventInput): Promise<void> => {
		const { event } = input;

		switch (event.type) {
			case "session.created": {
				const sessionId = (event.properties?.id as string) ?? "unknown";
				sessionStartTimes.set(sessionId, Date.now());
				log(`Session started: ${sessionId}`);
				break;
			}

			case "session.idle": {
				const sessionId = (event.properties?.sessionId as string) ?? "unknown";
				const startTime = sessionStartTimes.get(sessionId);
				if (startTime) {
					const duration = ((Date.now() - startTime) / 1000).toFixed(1);
					log(`Session idle: ${sessionId} (${duration}s)`);
				} else {
					log(`Session idle: ${sessionId}`);
				}
				logVerbose("Session properties:", JSON.stringify(event.properties));
				break;
			}

			case "session.error": {
				const sessionId = (event.properties?.sessionId as string) ?? "unknown";
				const errorMsg = (event.properties?.error as string) ?? "unknown error";
				log(`Session error: ${sessionId} — ${errorMsg}`);
				break;
			}

			default:
				logVerbose(`Event: ${event.type}`);
				break;
		}
	};
}
