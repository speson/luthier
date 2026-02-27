import type { Hooks } from "@opencode-ai/plugin";
import type { LuthierConfig } from "../config/schema.js";
import { logVerbose } from "../shared/log.js";

/**
 * A command entry for the Ctrl+P palette.
 *
 * - `key`:         Dot-notation name (e.g. "luthier.preset") — the dot prefix
 *                  is expected to produce a "Luthier" group header in the TUI.
 * - `description`: Short text shown next to the command name.
 * - `template`:    Prompt sent to the AI when the command is selected.
 * - `guide`:       Detailed instructions injected via `command.execute.before`
 *                  to help the AI perform the action correctly.
 */
interface PaletteCommand {
	key: string;
	description: string;
	template: string;
	guide: string;
}

// ─── Palette command definitions ────────────────────────────────────────────

const LUTHIER_PALETTE: PaletteCommand[] = [
	// ── Preset & Persona ──
	{
		key: "luthier.preset",
		description: "Switch UX preset",
		template: "Switch my luthier UX preset. Show available presets and let me choose.",
		guide: `Switch the luthier UX preset. Use the \`luthier_config\` tool.

**Available presets:**
| Preset | Persona | Tone | Verbosity | Language |
|--------|---------|------|-----------|----------|
| \`default\` | Sisyphus (master orchestrator) | professional | concise | ko |
| \`minimal\` | (none) | terse | concise | — |
| \`verbose\` | Mentor (senior engineer) | academic | detailed | — |
| \`pair-buddy\` | Buddy (pair programmer) | casual | balanced | — |

1. Show the user the table above
2. Ask which preset they want
3. Use \`luthier_config\` with action \`set\`, key \`ux.preset\`, value as JSON string (e.g. \`"default"\`)
4. Note: Restart may be required for full effect`,
	},
	{
		key: "luthier.persona",
		description: "Change persona name and role",
		template: "Change my luthier persona settings.",
		guide: `Change the luthier persona. Use the \`luthier_config\` tool.

**Persona fields:**
- \`ux.persona.name\` — Display name (e.g. "Sisyphus", "Mentor", or any custom name)
- \`ux.persona.role\` — Role description (e.g. "master orchestrator and code craftsman")
- \`ux.persona.traits\` — Array of trait keywords (e.g. ["methodical", "evidence-driven"])

1. First, use \`luthier_config\` with action \`get\`, key \`ux.persona\` to show current values
2. Ask what the user wants to change
3. Use \`luthier_config\` with action \`set\` for each field`,
	},

	// ── Communication ──
	{
		key: "luthier.language",
		description: "Change response language",
		template: "Change my luthier response language.",
		guide: `Change the response language. Use the \`luthier_config\` tool.

**Config key:** \`ux.communication.language\`
**Common values:** \`"ko"\` (Korean), \`"en"\` (English), \`"ja"\` (Japanese), \`"zh"\` (Chinese)

1. Use \`luthier_config\` with action \`get\`, key \`ux.communication.language\` to show current value
2. Ask which language the user wants
3. Use \`luthier_config\` with action \`set\`, key \`ux.communication.language\`, value as JSON string`,
	},
	{
		key: "luthier.tone",
		description: "Change communication tone",
		template: "Change my luthier communication tone.",
		guide: `Change the communication tone. Use the \`luthier_config\` tool.

**Config key:** \`ux.communication.tone\`
**Available tones:**
- \`"professional"\` — Formal, business-appropriate
- \`"casual"\` — Conversational, friendly
- \`"academic"\` — Precise, technical detail
- \`"terse"\` — Minimum words, maximum information

1. Use \`luthier_config\` with action \`get\`, key \`ux.communication.tone\` to show current value
2. Present options and ask user preference
3. Use \`luthier_config\` with action \`set\`, key \`ux.communication.tone\`, value as JSON string`,
	},
	{
		key: "luthier.verbosity",
		description: "Change response verbosity",
		template: "Change my luthier response verbosity level.",
		guide: `Change the response verbosity. Use the \`luthier_config\` tool.

**Config key:** \`ux.communication.verbosity\`
**Available levels:**
- \`"concise"\` — Avoid unnecessary preamble and filler
- \`"balanced"\` — Balance between brevity and completeness
- \`"detailed"\` — Thorough, explain reasoning and trade-offs

1. Use \`luthier_config\` with action \`get\`, key \`ux.communication.verbosity\` to show current value
2. Present options and ask user preference
3. Use \`luthier_config\` with action \`set\`, key \`ux.communication.verbosity\`, value as JSON string`,
	},

	// ── Toggle Features ──
	{
		key: "luthier.toast",
		description: "Toggle toast notifications",
		template: "Toggle luthier toast notifications on or off.",
		guide: `Toggle toast notifications. Use the \`luthier_config\` tool.

**Config key:** \`tui.toast.enabled\` (boolean)

1. Use \`luthier_config\` with action \`get\`, key \`tui.toast.enabled\` to check current value
2. Flip the value: if \`true\` → set to \`false\`, if \`false\` → set to \`true\`
3. Use \`luthier_config\` with action \`set\`, key \`tui.toast.enabled\`, value as JSON string
4. Confirm the change to the user`,
	},
	{
		key: "luthier.context",
		description: "Toggle context injection in messages",
		template: "Toggle luthier context injection (cwd, git branch) in messages.",
		guide: `Toggle context metadata injection into chat messages. Use the \`luthier_config\` tool.

**Config key:** \`hooks.chat-message.inject_context\` (boolean)
**What it does:** When enabled, injects working directory, git branch, and other environment info into every message sent to the AI.

1. Use \`luthier_config\` with action \`get\`, key \`hooks.chat-message.inject_context\` to check current value
2. Flip the value: if \`true\` → set to \`false\`, if \`false\` → set to \`true\`
3. Use \`luthier_config\` with action \`set\`, key \`hooks.chat-message.inject_context\`, value as JSON string
4. Confirm the change to the user`,
	},
	{
		key: "luthier.quality",
		description: "Toggle code quality module",
		template: "Toggle luthier code quality checking module.",
		guide: `Toggle the code quality module. Use the \`luthier_config\` tool.

**Config key:** \`modules.quality.enabled\` (boolean)
**What it does:** When enabled, enforces type safety checks, detects empty catch blocks, and protects test integrity. Sub-toggles: \`modules.quality.type_safety\`, \`modules.quality.empty_catch\`, \`modules.quality.test_integrity\`.

1. Use \`luthier_config\` with action \`get\`, key \`modules.quality\` to show current state
2. Toggle \`modules.quality.enabled\`: if \`true\` → set to \`false\`, if \`false\` → set to \`true\`
3. Use \`luthier_config\` with action \`set\`, key \`modules.quality.enabled\`, value as JSON string
4. Confirm the change to the user`,
	},
	{
		key: "luthier.workflow",
		description: "Toggle workflow module (todo, verification)",
		template: "Toggle luthier workflow module (todo management, verification).",
		guide: `Toggle the workflow module. Use the \`luthier_config\` tool.

**Config key:** \`modules.workflow.enabled\` (boolean)
**What it does:** When enabled, enforces todo management, todo continuation, verification requirements, and evidence collection. Sub-toggles: \`modules.workflow.todo_management\`, \`modules.workflow.todo_continuation\`, \`modules.workflow.verification\`, \`modules.workflow.evidence_required\`.

1. Use \`luthier_config\` with action \`get\`, key \`modules.workflow\` to show current state
2. Toggle \`modules.workflow.enabled\`: if \`true\` → set to \`false\`, if \`false\` → set to \`true\`
3. Use \`luthier_config\` with action \`set\`, key \`modules.workflow.enabled\`, value as JSON string
4. Confirm the change to the user`,
	},

	// ── Config & Status ──
	{
		key: "luthier.config",
		description: "Manage luthier configuration",
		template: "Manage luthier plugin configuration. Use the luthier_config tool to help me view or change my settings.",
		guide: `The user wants to manage luthier plugin configuration.
You have the \`luthier_config\` tool available with these actions:

- **list** — Show all current configuration values
- **get <key>** — Read a specific value (dot-notation, e.g. \`hooks.chat-message.inject_context\`)
- **set <key> <value>** — Write a value to project config (value as JSON string)
- **reset <key>** — Remove a project-level override, reverting to default

Start by asking what the user wants to do, or use \`luthier_config\` with action \`list\` to show everything.`,
	},
	{
		key: "luthier.status",
		description: "Show current luthier configuration",
		template: "Show my current luthier configuration status.",
		guide: `Show the current luthier configuration status. Use the \`luthier_config\` tool.

1. Use \`luthier_config\` with action \`list\` to retrieve all current settings
2. Present the results in a clean, organized format
3. Highlight any non-default values (overrides from project config)`,
	},
];

// ─── Hook factories ─────────────────────────────────────────────────────────

/**
 * Config hook — registers all Luthier palette commands into OpenCode's
 * command map so they appear in the Ctrl+P command palette.
 */
export function createLuthierPaletteConfigHook(_config: LuthierConfig): Hooks["config"] {
	return async (input) => {
		// biome-ignore lint/suspicious/noExplicitAny: OpenCode Config command map
		if (!(input as any).command) (input as any).command = {};

		let registered = 0;
		for (const cmd of LUTHIER_PALETTE) {
			// biome-ignore lint/suspicious/noExplicitAny: Config.command record
			if (!(input as any).command[cmd.key]) {
				// biome-ignore lint/suspicious/noExplicitAny: Config.command record
				(input as any).command[cmd.key] = {
					template: cmd.template,
					description: cmd.description,
				};
				registered++;
			}
		}

		if (registered > 0) {
			logVerbose(`Registered ${registered} luthier palette commands`);
		}
	};
}

/**
 * Command intercept hook — injects detailed guide prompts when a
 * Luthier palette command is executed, giving the AI the context
 * it needs to perform the action correctly.
 */
export function createLuthierPaletteBeforeHook(_config: LuthierConfig): Hooks["command.execute.before"] {
	const guideMap = new Map(LUTHIER_PALETTE.map((cmd) => [cmd.key, cmd.guide]));

	return async (input, output) => {
		const guide = guideMap.get(input.command);
		if (!guide) return;

		let prompt = guide;
		if (input.arguments?.trim()) {
			prompt += `\n\n**User request:** ${input.arguments.trim()}`;
		}

		// biome-ignore lint/suspicious/noExplicitAny: Part requires id/sessionID/messageID but hook runtime accepts partial
		output.parts.push({ type: "text", text: prompt } as any);
		logVerbose(`Injected guide for palette command: ${input.command}`);
	};
}
