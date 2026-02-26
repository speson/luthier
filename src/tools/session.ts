import { type PluginInput, type ToolDefinition, tool } from "@opencode-ai/plugin";

/**
 * Creates a session info tool that provides project and session metadata.
 *
 * Uses the OpenCode SDK client to query session/project data.
 * All SDK calls return `{ data, error }` — we handle both cases.
 */
export function createSessionTool(ctx: PluginInput): ToolDefinition {
	return tool({
		description:
			"Get information about the current project and OpenCode session. Use to understand project context, list recent sessions, or get session details.",
		args: {
			action: tool.schema
				.enum(["project-info", "list-sessions", "current-session"])
				.describe("What information to retrieve"),
			session_id: tool.schema.string().optional().describe("Session ID for specific session queries"),
		},
		async execute(args, context) {
			context.metadata({ title: `Session: ${args.action}` });

			try {
				switch (args.action) {
					case "project-info": {
						return JSON.stringify(
							{
								directory: ctx.directory,
								worktree: ctx.worktree,
								serverUrl: ctx.serverUrl.toString(),
							},
							null,
							2,
						);
					}

					case "list-sessions": {
						const result = await ctx.client.session.list();
						if ("error" in result && result.error) {
							return `Failed to list sessions: ${JSON.stringify(result.error)}`;
						}
						const sessions = result.data;
						if (!sessions || !Array.isArray(sessions) || sessions.length === 0) {
							return "No sessions found.";
						}
						return sessions
							.slice(0, 10)
							.map((s: Record<string, unknown>) => `- ${s.id ?? "?"} (${s.title ?? "untitled"})`)
							.join("\n");
					}

					case "current-session": {
						const sessionId = args.session_id ?? context.sessionID;
						const result = await ctx.client.session.get({
							path: { id: sessionId },
						});
						if ("error" in result && result.error) {
							return `Session not found: ${sessionId}`;
						}
						const session = result.data as Record<string, unknown> | undefined;
						if (!session) {
							return `Session not found: ${sessionId}`;
						}
						return JSON.stringify(
							{
								id: session.id,
								title: session.title,
								createdAt: (session.time as Record<string, unknown> | undefined)?.created,
							},
							null,
							2,
						);
					}

					default:
						return `Unknown action: ${args.action}`;
				}
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err);
				return `Error: ${msg}`;
			}
		},
	});
}
