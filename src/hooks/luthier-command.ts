import type { Hooks } from "@opencode-ai/plugin";
import type { LuthierConfig } from "../config/schema.js";
import { logVerbose } from "../shared/log.js";

const LUTHIER_COMMAND_TEMPLATE =
	"Manage luthier configuration. Use the luthier_config tool to help me view or change my settings.";

const GUIDE_PROMPT = `The user wants to manage luthier plugin configuration.
You have the \`luthier_config\` tool available with these actions:

- **list** — Show all current configuration values
- **get <key>** — Read a specific value (dot-notation, e.g. \`hooks.chat-message.inject_context\`)
- **set <key> <value>** — Write a value to project config (value as JSON string)
- **reset <key>** — Remove a project-level override, reverting to default

**Common config keys:**
| Key | Description | Example values |
|-----|-------------|----------------|
| \`hooks.chat-message.inject_context\` | Inject context metadata into messages | \`true\`, \`false\` |
| \`hooks.chat-message.system_directives\` | System directives for the AI | \`["Be concise"]\` |
| \`hooks.permission-handler.auto_allow\` | Auto-allow tool patterns | \`["Read", "bash:ls *"]\` |
| \`hooks.tool-interceptor.max_output_length\` | Max tool output chars (0=unlimited) | \`5000\` |
| \`hooks.shell-env.vars\` | Static env vars for shell | \`{"DEBUG":"true"}\` |
| \`tools.web_search.provider\` | Web search provider | \`"exa"\`, \`"tavily"\` |
| \`tools.web_search.max_results\` | Max search results | \`5\`, \`10\` |
| \`disabled_hooks\` | Hooks to disable | \`["toast", "metrics-event"]\` |
| \`ux.communication.language\` | Response language | \`"ko"\`, \`"en"\` |
| \`ux.communication.tone\` | Communication tone | \`"professional"\`, \`"casual"\` |
| \`modules.templates_enabled\` | Enable template rendering | \`true\`, \`false\` |

Start by calling \`luthier_config\` with the appropriate action.`;

export function createLuthierCommandConfigHook(_config: LuthierConfig): Hooks["config"] {
	return async (input) => {
		// biome-ignore lint/suspicious/noExplicitAny: OpenCode Config command map
		if (!(input as any).command) (input as any).command = {};
		// biome-ignore lint/suspicious/noExplicitAny: OpenCode Config command map
		if (!(input as any).command.luthier) {
			// biome-ignore lint/suspicious/noExplicitAny: OpenCode Config command map
			(input as any).command.luthier = {
				template: LUTHIER_COMMAND_TEMPLATE,
				description: "Manage luthier plugin configuration",
			};
			logVerbose("Registered /luthier command");
		}
	};
}

export function createLuthierCommandBeforeHook(_config: LuthierConfig): Hooks["command.execute.before"] {
	return async (input, output) => {
		if (input.command !== "luthier") return;

		let prompt = GUIDE_PROMPT;
		if (input.arguments?.trim()) {
			prompt += `\n\n**User request:** ${input.arguments.trim()}`;
		}

		// biome-ignore lint/suspicious/noExplicitAny: Part requires id/sessionID/messageID but hook runtime accepts partial
		output.parts.push({ type: "text", text: prompt } as any);
		logVerbose("Injected luthier config guide prompt");
	};
}
