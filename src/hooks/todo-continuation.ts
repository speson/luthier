import type { Hooks, PluginInput } from "@opencode-ai/plugin";
import type { LuthierConfig } from "../config/schema.js";
import { logVerbose } from "../shared/log.js";

/**
 * System reminder injected when the session goes idle.
 *
 * This is the core mechanism for preventing the agent from stopping
 * with incomplete tasks — inspired by oh-my-opencode's
 * todo-continuation-enforcer hook.
 */
const TODO_CONTINUATION_REMINDER = `[SYSTEM REMINDER - TODO CONTINUATION]

Before stopping, verify:
1. Check your todo list — are all items marked complete?
2. If any items are still pending or in_progress, CONTINUE WORKING.
3. Only stop if ALL todos are completed or explicitly cancelled.
4. If you created todos but didn't finish them, that's incomplete work.

DO NOT stop with incomplete todos unless the user explicitly tells you to stop.`;

/**
 * Creates an event hook that monitors session idle events
 * and re-prompts the agent if there are likely incomplete tasks.
 *
 * Uses `client.session.prompt()` with `noReply: true` to silently
 * inject the continuation reminder without creating a visible message.
 */
export function createTodoContinuationHook(config: LuthierConfig, ctx: PluginInput): Hooks["event"] {
	// Check if todo continuation is disabled
	if (config.disabled_hooks.includes("todo-continuation")) {
		return undefined;
	}

	return async (input) => {
		const { event } = input;

		if (event.type !== "session.idle") return;

		const sessionId = (event.properties as Record<string, unknown>)?.sessionId as string | undefined;
		if (!sessionId) return;

		try {
			// Check if session has active todos
			const todoResult = await ctx.client.session.todo({
				path: { id: sessionId },
			});

			if ("error" in todoResult && todoResult.error) {
				logVerbose("Todo continuation: failed to fetch todos");
				return;
			}

			const todos = todoResult.data;
			if (!todos || !Array.isArray(todos)) return;

			// Check for incomplete todos
			const incomplete = todos.filter(
				(t: Record<string, unknown>) => t.status === "pending" || t.status === "in_progress",
			);

			if (incomplete.length === 0) {
				logVerbose("Todo continuation: all todos complete, no reminder needed");
				return;
			}

			logVerbose(`Todo continuation: ${incomplete.length} incomplete todo(s), injecting reminder`);

			// Silently inject continuation reminder
			await ctx.client.session.prompt({
				path: { id: sessionId },
				body: {
					parts: [{ type: "text", text: TODO_CONTINUATION_REMINDER }],
					noReply: true,
				},
			});
		} catch (err) {
			logVerbose(`Todo continuation error: ${err}`);
		}
	};
}
