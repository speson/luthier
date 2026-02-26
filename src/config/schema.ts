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

	/** Session lifecycle tracking */
	session_tracking: SessionTrackingSchema.default({}),

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

export const DEFAULT_CONFIG: LuthierConfig = LuthierConfigSchema.parse({});
