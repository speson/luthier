import type { Hooks, PluginInput } from "@opencode-ai/plugin";
import type { LuthierConfig, NotificationChannel } from "../config/schema.js";
import { log, logError, logVerbose } from "../shared/log.js";

/**
 * Creates an event hook that sends external notifications
 * when sessions complete or error out.
 *
 * Supports:
 *   - Discord webhooks
 *   - Slack incoming webhooks
 *   - Generic webhooks (POST JSON)
 *
 * Webhook URLs can reference env vars with `$VAR_NAME` syntax.
 */
export function createNotificationHook(config: LuthierConfig, _ctx: PluginInput): Hooks["event"] {
	const notifyConfig = config.notifications;

	if (notifyConfig.channels.length === 0) {
		return undefined;
	}

	if (!notifyConfig.on_complete && !notifyConfig.on_error) {
		return undefined;
	}

	return async (input) => {
		const { event } = input;

		let shouldNotify = false;
		let eventType = "";
		let sessionId = "";

		if (event.type === "session.idle" && notifyConfig.on_complete) {
			shouldNotify = true;
			eventType = "completed";
			sessionId = ((event.properties as Record<string, unknown>)?.sessionId as string) ?? "unknown";
		} else if (event.type === "session.error" && notifyConfig.on_error) {
			shouldNotify = true;
			eventType = "error";
			sessionId = ((event.properties as Record<string, unknown>)?.sessionId as string) ?? "unknown";
		}

		if (!shouldNotify) return;

		const message = `[luthier] Session ${eventType}: ${sessionId}`;

		for (const channel of notifyConfig.channels) {
			try {
				await sendNotification(channel, message);
				logVerbose(`Notification sent via ${channel.type}`);
			} catch (err) {
				logError(`Notification failed (${channel.type}):`, err);
			}
		}
	};
}

/**
 * Resolve a webhook URL, expanding `$VAR_NAME` references.
 */
function resolveWebhook(webhook: string): string | undefined {
	if (webhook.startsWith("$")) {
		const envVar = webhook.slice(1);
		return process.env[envVar];
	}
	return webhook;
}

/**
 * Send a notification to a single channel.
 */
async function sendNotification(channel: NotificationChannel, message: string): Promise<void> {
	const url = resolveWebhook(channel.webhook);
	if (!url) {
		logVerbose(`Webhook not resolved: ${channel.webhook}`);
		return;
	}

	let body: string;

	switch (channel.type) {
		case "discord":
			body = JSON.stringify({ content: message });
			break;
		case "slack":
			body = JSON.stringify({ text: message });
			break;
		default:
			body = JSON.stringify({ message, timestamp: new Date().toISOString() });
			break;
	}

	const response = await fetch(url, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body,
	});

	if (!response.ok) {
		throw new Error(`HTTP ${response.status}: ${response.statusText}`);
	}

	log(`Notification delivered: ${channel.type}`);
}
