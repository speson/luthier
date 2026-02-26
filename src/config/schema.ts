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
 * Tool configuration schema — whitelist/blacklist tools.
 */
const ToolConfigSchema = z.object({
	enabled: z.array(z.string()).optional(),
	disabled: z.array(z.string()).optional(),
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

export const DEFAULT_CONFIG: LuthierConfig = LuthierConfigSchema.parse({});
