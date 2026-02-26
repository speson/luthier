import type { Hooks, PluginInput } from "@opencode-ai/plugin";
import { createAgentOverridesHook, createAgentSystemHook } from "../agents/overrides.js";
import type { LuthierConfig } from "../config/schema.js";
import { createNotificationHook } from "../features/notify.js";
import { createMcpConfigHook } from "../mcp/config-hook.js";
import { createCircuitBreakerHook } from "../quality/circuit-breaker.js";
import { log, logVerbose } from "../shared/log.js";
import { createMetricsEventHook, createMetricsMessageHook, createMetricsToolHook } from "../state/metrics.js";
import { createToastHook } from "../tui/toast.js";
import { createChatMessageHook, createSystemTransformHook } from "./chat-message.js";
import { createCodeSimplifierHook } from "./code-simplifier.js";
import { createCompactionHook } from "./compaction.js";
import { createContextMonitorHook } from "./context-monitor.js";
import { createEventHook } from "./event-tracker.js";
import { createPermissionHook } from "./permission-handler.js";
import { createSessionRecoveryHook } from "./session-recovery.js";
import { createShellEnvHook } from "./shell-env.js";
import { createTodoContinuationHook } from "./todo-continuation.js";
import { createToolAfterHook, createToolBeforeHook } from "./tool-interceptor.js";
import { createValidationGateHook } from "./validation-gate.js";

/**
 * Hook entry — a named hook with its target key in the Hooks interface
 * and a factory function that produces the hook handler.
 */
interface HookEntry<K extends keyof Hooks> {
	/** Unique hook name — matches `disabled_hooks` entries and `hooks.*` config keys. */
	name: string;
	/** Target key on the Hooks object returned to OpenCode. */
	key: K;
	/** Factory that produces the hook handler. */
	create: (config: LuthierConfig, ctx: PluginInput) => Hooks[K];
}

/**
 * All registered hooks. Each entry defines a name (for disable matching),
 * the Hooks key it contributes to, and a factory function.
 *
 * Multiple hooks CAN target the same key — they'll be composed in order.
 * To add a new hook: append an entry here. The registry handles the rest.
 */
function getHookEntries(): HookEntry<keyof Hooks>[] {
	return [
		{
			name: "event-tracker",
			key: "event",
			create: (config) => createEventHook(config),
		},
		{
			name: "permission-handler",
			key: "permission.ask",
			create: (config) => createPermissionHook(config),
		},
		{
			name: "chat-message",
			key: "chat.message",
			create: (config) => createChatMessageHook(config),
		},
		{
			name: "system-directives",
			key: "experimental.chat.system.transform",
			create: (config) => createSystemTransformHook(config),
		},
		{
			name: "agent-overrides",
			key: "chat.params",
			create: (config, ctx) => createAgentOverridesHook(config, ctx),
		},
		{
			name: "agent-system",
			key: "experimental.chat.system.transform",
			create: (config, ctx) => createAgentSystemHook(config, ctx),
		},
		{
			name: "tool-interceptor-before",
			key: "tool.execute.before",
			create: (config) => createToolBeforeHook(config),
		},
		{
			name: "tool-interceptor-after",
			key: "tool.execute.after",
			create: (config) => createToolAfterHook(config),
		},
		{
			name: "shell-env",
			key: "shell.env",
			create: (config) => createShellEnvHook(config),
		},
		{
			name: "compaction",
			key: "experimental.session.compacting",
			create: (config) => createCompactionHook(config),
		},
		{
			name: "metrics-event",
			key: "event",
			create: (config, ctx) => createMetricsEventHook(config, ctx),
		},
		{
			name: "metrics-tool",
			key: "tool.execute.after",
			create: (config, ctx) => createMetricsToolHook(config, ctx),
		},
		{
			name: "metrics-message",
			key: "chat.message",
			create: (config, ctx) => createMetricsMessageHook(config, ctx),
		},
		{
			name: "todo-continuation",
			key: "event",
			create: (config, ctx) => createTodoContinuationHook(config, ctx),
		},
		{
			name: "context-monitor",
			key: "chat.message",
			create: (config) => createContextMonitorHook(config),
		},
		{
			name: "session-recovery",
			key: "experimental.chat.system.transform",
			create: (config, ctx) => createSessionRecoveryHook(config, ctx),
		},
		{
			name: "toast",
			key: "event",
			create: (config, ctx) => createToastHook(config, ctx),
		},
		{
			name: "notifications",
			key: "event",
			create: (config, ctx) => createNotificationHook(config, ctx),
		},
		{
			name: "mcp-config",
			key: "config",
			create: (config) => createMcpConfigHook(config),
		},
		{
			name: "circuit-breaker",
			key: "tool.execute.after",
			create: (config, ctx) => createCircuitBreakerHook(config, ctx),
		},
		{
			name: "validation-gate",
			key: "experimental.chat.system.transform",
			create: (config) => createValidationGateHook(config),
		},
		{
			name: "code-simplifier",
			key: "tool.execute.after",
			create: (config) => createCodeSimplifierHook(config),
		},
	];
}

/**
 * Check if a hook is disabled by the user's config.
 *
 * Supports exact match and prefix match:
 *   - "event-tracker" disables "event-tracker" exactly
 *   - "tool-interceptor" disables both "tool-interceptor-before" and "tool-interceptor-after"
 */
function isHookDisabled(hookName: string, disabledHooks: string[]): boolean {
	return disabledHooks.some((disabled) => hookName === disabled || hookName.startsWith(`${disabled}-`));
}

/**
 * Compose two async hook handlers that share the same (input, output) signature.
 * Both handlers run in sequence — first, then second.
 */
function composeHandlers<I, O>(
	first: (input: I, output: O) => Promise<void>,
	second: (input: I, output: O) => Promise<void>,
): (input: I, output: O) => Promise<void> {
	return async (input: I, output: O) => {
		await first(input, output);
		await second(input, output);
	};
}

/**
 * Build the composed Hooks object from all registered hooks,
 * respecting the user's `disabled_hooks` configuration.
 *
 * When multiple hooks target the same key, they are composed in order
 * (each handler runs sequentially, mutating the shared output).
 *
 * This is the central entrypoint for hook composition in luthier.
 */
export function buildHooks(config: LuthierConfig, ctx: PluginInput): Hooks {
	const hooks: Hooks = {};
	const entries = getHookEntries();
	const disabled = config.disabled_hooks;

	let enabledCount = 0;
	let disabledCount = 0;

	for (const entry of entries) {
		if (isHookDisabled(entry.name, disabled)) {
			logVerbose(`Hook disabled: ${entry.name}`);
			disabledCount++;
			continue;
		}

		const handler = entry.create(config, ctx);
		if (handler) {
			// biome-ignore lint/suspicious/noExplicitAny: Hooks interface has heterogeneous value types per key
			const existing = (hooks as any)[entry.key];
			if (existing && typeof existing === "function" && typeof handler === "function") {
				// Compose multiple handlers for the same key
				// biome-ignore lint/suspicious/noExplicitAny: composing heterogeneous hook signatures
				(hooks as any)[entry.key] = composeHandlers(existing, handler as any);
				logVerbose(`Hook composed: ${entry.name} → ${entry.key} (chained)`);
			} else {
				// biome-ignore lint/suspicious/noExplicitAny: Hooks interface has heterogeneous value types
				(hooks as any)[entry.key] = handler;
				logVerbose(`Hook registered: ${entry.name} → ${entry.key}`);
			}
			enabledCount++;
		}
	}

	log(`Hooks: ${enabledCount} enabled, ${disabledCount} disabled`);
	return hooks;
}
