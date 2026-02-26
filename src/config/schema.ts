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

/**
 * Root luthier configuration schema.
 *
 * The Custom Shop philosophy: everything the user might want to tweak
 * is exposed here. Sensible defaults mean zero config is also valid.
 */
export const LuthierConfigSchema = z.object({
	/** Hooks to disable by name */
	disabled_hooks: z.array(z.string()).default([]),

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

export const DEFAULT_CONFIG: LuthierConfig = LuthierConfigSchema.parse({});
