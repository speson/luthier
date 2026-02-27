import { z } from "zod";

/**
 * Agent override schema — lets users customize model, temperature,
 * and system prompt per agent.
 */
const AgentOverrideSchema = z.object({
	model: z.string().optional(),
	temperature: z.number().min(0).max(2).optional(),
	systemPrompt: z.string().optional(),
	disabled: z.boolean().optional(),
});

/**
 * Web search provider configuration.
 */
const WebSearchConfigSchema = z.object({
	/** Search provider: "exa" or "tavily". */
	provider: z.enum(["exa", "tavily"]).default("exa"),
	/** Env var name that holds the API key (NOT the key itself). */
	api_key_env: z.string().default("EXA_API_KEY"),
	/** Max results to return. */
	max_results: z.number().min(1).max(20).default(5),
});

/**
 * Tool configuration schema — whitelist/blacklist tools + per-tool settings.
 */
const ToolConfigSchema = z.object({
	enabled: z.array(z.string()).optional(),
	disabled: z.array(z.string()).optional(),
	/** Web search tool configuration. */
	web_search: WebSearchConfigSchema.default({}),
});

/**
 * Session tracking configuration.
 */
const SessionTrackingSchema = z.object({
	enabled: z.boolean().default(true),
	logLevel: z.enum(["silent", "minimal", "verbose"]).default("minimal"),
});

// ─── Hook-specific configuration schemas ───

/**
 * Permission handler config — auto-allow or auto-deny tool permissions.
 *
 * Patterns support glob-like matching:
 *   - "Read" — matches tool name exactly
 *   - "bash:rm *" — matches tool:arg pattern
 *   - "*" — matches everything (use with caution)
 */
const PermissionHandlerConfigSchema = z.object({
	/** Patterns to auto-allow without asking. */
	auto_allow: z.array(z.string()).default([]),
	/** Patterns to auto-deny silently. */
	auto_deny: z.array(z.string()).default([]),
});

/**
 * Chat message hook config — context and directive injection.
 */
const ChatMessageConfigSchema = z.object({
	/** Whether to inject contextual metadata (cwd, git branch, etc.) into messages. */
	inject_context: z.boolean().default(false),
	/** System directives appended to the system prompt (e.g. "Always respond in Korean"). */
	system_directives: z.array(z.string()).default([]),
});

/**
 * Tool interceptor config — modify tool args before execution and output after.
 */
const ToolInterceptorConfigSchema = z.object({
	/** Max characters for tool output before truncation. 0 = no limit. */
	max_output_length: z.number().min(0).default(0),
	/** Tool names whose output should never be truncated, even if max_output_length is set. */
	truncation_exempt: z.array(z.string()).default([]),
	/** Blocked tool names — execution is silently skipped. */
	blocked_tools: z.array(z.string()).default([]),
});

/**
 * Shell env hook config — inject environment variables.
 */
const ShellEnvConfigSchema = z.object({
	/** Static env vars to inject into every shell execution. */
	vars: z.record(z.string(), z.string()).default({}),
	/** Env var names to forward from the host process. */
	forward: z.array(z.string()).default([]),
});

/**
 * Compaction hook config — customize session compaction behavior.
 */
const CompactionConfigSchema = z.object({
	/** Extra context strings appended to the compaction prompt. */
	context: z.array(z.string()).default([]),
	/** Custom compaction prompt. If set, replaces the default entirely. */
	prompt: z.string().optional(),
});

/**
 * Hooks configuration — per-hook settings.
 * Every hook is optional with sensible defaults.
 */
const HooksConfigSchema = z.object({
	"permission-handler": PermissionHandlerConfigSchema.default({}),
	"chat-message": ChatMessageConfigSchema.default({}),
	"tool-interceptor": ToolInterceptorConfigSchema.default({}),
	"shell-env": ShellEnvConfigSchema.default({}),
	compaction: CompactionConfigSchema.default({}),
});

// ─── Agent orchestration schemas ───

/**
 * Category definition — maps a task category to a model and description.
 *
 * oh-my-opencode defines categories like quick, deep, visual-engineering, ultrabrain.
 * luthier lets users add custom categories and override defaults.
 */
const CategorySchema = z.object({
	/** Model ID to use for this category (e.g. "claude-sonnet-4-20250514"). */
	model: z.string().optional(),
	/** Human-readable description of what this category is for. */
	description: z.string().optional(),
	/** Temperature override for this category. */
	temperature: z.number().min(0).max(2).optional(),
});

/**
 * Skills configuration — where to find skill files and which to disable.
 *
 * Skills are Markdown files with YAML frontmatter containing:
 *   - name, description, trigger (keywords/phrases)
 *   - The markdown body becomes the skill instruction prompt.
 */
const SkillsConfigSchema = z.object({
	/** Directory to discover skill .md files (relative to project root). */
	directory: z.string().default(".opencode/luthier/skills"),
	/** Skill names to disable (won't be loaded even if files exist). */
	disabled: z.array(z.string()).default([]),
	/** Additional skill directories to search (for shared/global skills). */
	extra_directories: z.array(z.string()).default([]),
});

// ─── MCP server schemas ───

/**
 * Bundled MCP server toggle — enable/disable pre-configured servers.
 */
const BundledMcpToggleSchema = z.object({
	enabled: z.boolean().default(true),
});

/**
 * Custom MCP server definition.
 */
const CustomMcpServerSchema = z.object({
	/** Unique name for the server (used as key in OpenCode config). */
	name: z.string(),
	/** Server type: remote (HTTP) or local (subprocess). */
	type: z.enum(["remote", "local"]),
	/** URL for remote servers. */
	url: z.string().optional(),
	/** Command + args for local servers. */
	command: z.array(z.string()).optional(),
	/** Whether this server is enabled. */
	enabled: z.boolean().default(true),
	/** HTTP headers for remote servers. */
	headers: z.record(z.string(), z.string()).optional(),
	/** Environment variables for local servers. */
	environment: z.record(z.string(), z.string()).optional(),
});

/**
 * MCP server configuration.
 */
const McpConfigSchema = z.object({
	/** Toggle bundled MCP servers on/off. */
	bundled: z
		.object({
			context7: BundledMcpToggleSchema.default({}),
			"grep-app": BundledMcpToggleSchema.default({}),
		})
		.default({}),
	/** Custom MCP server definitions. */
	custom: z.array(CustomMcpServerSchema).default([]),
});

// ─── TUI & Notification schemas ───

/**
 * Toast notification configuration.
 */
const ToastConfigSchema = z.object({
	enabled: z.boolean().default(true),
	/** Toast display duration in milliseconds. */
	duration: z.number().min(0).default(3000),
});

/**
 * Theme configuration — customize visual output.
 */
const ThemeConfigSchema = z.object({
	/** Log message prefix. */
	prefix: z.string().default("[luthier]"),
	/** Color assignments for log levels. */
	colors: z
		.object({
			success: z.string().default("green"),
			warning: z.string().default("yellow"),
			error: z.string().default("red"),
			info: z.string().default("blue"),
		})
		.default({}),
});

/**
 * TUI configuration.
 */
const TuiConfigSchema = z.object({
	toast: ToastConfigSchema.default({}),
	theme: ThemeConfigSchema.default({}),
});

/**
 * Notification channel definition.
 */
const NotificationChannelSchema = z.object({
	/** Channel type: discord, slack, or generic webhook. */
	type: z.enum(["discord", "slack", "webhook"]),
	/** Webhook URL or env var reference (prefixed with $). */
	webhook: z.string(),
});

/**
 * Notification configuration.
 */
const NotificationsConfigSchema = z.object({
	/** Whether to send notifications on session completion. */
	on_complete: z.boolean().default(false),
	/** Whether to send notifications on session error. */
	on_error: z.boolean().default(false),
	/** Notification delivery channels. */
	channels: z.array(NotificationChannelSchema).default([]),
});

// ─── Module configuration schemas ───

/**
 * Orchestration module configuration.
 */
const OrchestrationModuleSchema = z.object({
	enabled: z.boolean().default(true),
	intent_gate: z.boolean().default(true),
	codebase_assessment: z.boolean().default(true),
	execution: z.boolean().default(true),
	completion: z.boolean().default(true),
});

/**
 * Delegation module configuration.
 */
const DelegationModuleSchema = z.object({
	enabled: z.boolean().default(true),
	agents: z
		.object({
			explore: z.boolean().default(true),
			librarian: z.boolean().default(true),
			oracle: z.boolean().default(true),
			metis: z.boolean().default(true),
			momus: z.boolean().default(true),
		})
		.default({}),
});

/**
 * Quality module configuration.
 */
const QualityModuleSchema = z.object({
	enabled: z.boolean().default(true),
	type_safety: z.boolean().default(true),
	empty_catch: z.boolean().default(true),
	test_integrity: z.boolean().default(true),
});

/**
 * Workflow module configuration.
 */
const WorkflowModuleSchema = z.object({
	enabled: z.boolean().default(true),
	todo_management: z.boolean().default(true),
	todo_continuation: z.boolean().default(true),
	verification: z.boolean().default(true),
	evidence_required: z.boolean().default(true),
});

/**
 * Failure recovery module configuration.
 */
const FailureRecoveryModuleSchema = z.object({
	enabled: z.boolean().default(true),
});

/**
 * Built-in skills configuration.
 */
const BuiltinSkillsSchema = z.object({
	playwright: z.boolean().default(true),
	"git-master": z.boolean().default(true),
	"frontend-ui-ux": z.boolean().default(true),
	"dev-browser": z.boolean().default(true),
});

/**
 * Skills module configuration.
 */
const SkillsModuleSchema = z.object({
	enabled: z.boolean().default(true),
	builtin: BuiltinSkillsSchema.default({}),
});

/**
 * Modules configuration — feature toggles for luthier behavior modules.
 */
const ModulesConfigSchema = z.object({
	orchestration: OrchestrationModuleSchema.default({}),
	delegation: DelegationModuleSchema.default({}),
	quality: QualityModuleSchema.default({}),
	workflow: WorkflowModuleSchema.default({}),
	failure_recovery: FailureRecoveryModuleSchema.default({}),
	skills: SkillsModuleSchema.default({}),
});

// ─── UX configuration schemas ───

/**
 * Persona configuration.
 */
const PersonaConfigSchema = z.object({
	name: z.string().optional(),
	role: z.string().optional(),
	traits: z.array(z.string()).default([]),
});

/**
 * Communication configuration.
 */
const CommunicationConfigSchema = z.object({
	language: z.string().optional(),
	tone: z.enum(["professional", "casual", "academic", "terse"]).optional(),
	verbosity: z.enum(["concise", "balanced", "detailed"]).optional(),
});

/**
 * UX agent configuration.
 */
const UxAgentConfigSchema = z.object({
	color: z.string().optional(),
});

/**
 * Custom command configuration.
 */
const CustomCommandSchema = z.object({
	name: z.string(),
	description: z.string().optional(),
	command: z.string(),
});

/**
 * UX configuration — persona, communication style, visual settings.
 */
const UxConfigSchema = z.object({
	preset: z.enum(["default", "minimal", "verbose", "pair-buddy"]).default("default"),
	persona: PersonaConfigSchema.default({}),
	communication: CommunicationConfigSchema.default({}),
	theme: z.string().optional(),
	agents: z.record(z.string(), UxAgentConfigSchema).default({}),
	username: z.string().optional(),
	keybinds: z.record(z.string(), z.string()).default({}),
	tui: z
		.object({
			scroll_speed: z.number().optional(),
			scroll_acceleration: z.number().optional(),
			diff_style: z.string().optional(),
		})
		.default({}),
	toast: z
		.object({
			enabled: z.boolean().optional(),
			duration: z.number().optional(),
		})
		.default({}),
	commands: z.array(CustomCommandSchema).default([]),
});

/**
 * Root luthier configuration schema.
 *
 * The Custom Shop philosophy: everything the user might want to tweak
 * is exposed here. Sensible defaults mean zero config is also valid.
 */

export const LuthierConfigSchema = z.object({
	/** Hooks to disable by name */
	disabled_hooks: z.array(z.string()).default([]),

	/** Per-hook configuration */
	hooks: HooksConfigSchema.default({}),

	/** Per-agent overrides (model, temperature, system prompt) */
	agents: z.record(z.string(), AgentOverrideSchema).default({}),

	/** Task category definitions (quick, deep, visual-engineering, etc.) */
	categories: z.record(z.string(), CategorySchema).default({}),

	/** Skill file loading configuration */
	skills: SkillsConfigSchema.default({}),

	/** Tool enable/disable configuration */
	tools: ToolConfigSchema.default({}),

	/** MCP server configuration (bundled + custom) */
	mcp: McpConfigSchema.default({}),

	/** TUI customization (toasts, theme) */
	tui: TuiConfigSchema.default({}),

	/** External notification configuration */
	notifications: NotificationsConfigSchema.default({}),

	/** Session lifecycle tracking */
	session_tracking: SessionTrackingSchema.default({}),

	/** Feature module toggles — enable/disable luthier behavior modules */
	modules: ModulesConfigSchema.default({}),

	/** UX customization — persona, communication style, visual settings */
	ux: UxConfigSchema.default({}),

	/** Experimental features — opt-in only */
	experimental: z.record(z.string(), z.unknown()).default({}),
});

export type LuthierConfig = z.infer<typeof LuthierConfigSchema>;

export type PermissionHandlerConfig = z.infer<typeof PermissionHandlerConfigSchema>;
export type ChatMessageConfig = z.infer<typeof ChatMessageConfigSchema>;
export type ToolInterceptorConfig = z.infer<typeof ToolInterceptorConfigSchema>;
export type ShellEnvConfig = z.infer<typeof ShellEnvConfigSchema>;
export type CompactionConfig = z.infer<typeof CompactionConfigSchema>;
export type CategoryConfig = z.infer<typeof CategorySchema>;
export type SkillsConfig = z.infer<typeof SkillsConfigSchema>;
export type AgentOverrideConfig = z.infer<typeof AgentOverrideSchema>;
export type WebSearchConfig = z.infer<typeof WebSearchConfigSchema>;
export type McpConfig = z.infer<typeof McpConfigSchema>;
export type TuiConfig = z.infer<typeof TuiConfigSchema>;
export type NotificationsConfig = z.infer<typeof NotificationsConfigSchema>;
export type NotificationChannel = z.infer<typeof NotificationChannelSchema>;
export type ModulesConfig = z.infer<typeof ModulesConfigSchema>;
export type UxConfig = z.infer<typeof UxConfigSchema>;
export type PersonaConfig = z.infer<typeof PersonaConfigSchema>;
export type CommunicationConfig = z.infer<typeof CommunicationConfigSchema>;
export type UxAgentConfig = z.infer<typeof UxAgentConfigSchema>;
export type CustomCommand = z.infer<typeof CustomCommandSchema>;

export const DEFAULT_CONFIG: LuthierConfig = LuthierConfigSchema.parse({});
