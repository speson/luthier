import type { Hooks, PluginInput } from "@opencode-ai/plugin";
import type { LuthierConfig } from "../config/schema.js";
import { log, logVerbose } from "../shared/log.js";
import { createChatMessageHook, createSystemTransformHook } from "./chat-message.js";
import { createCompactionHook } from "./compaction.js";
import { createEventHook } from "./event-tracker.js";
import { createPermissionHook } from "./permission-handler.js";
import { createShellEnvHook } from "./shell-env.js";
import { createToolAfterHook, createToolBeforeHook } from "./tool-interceptor.js";

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
 * Build the composed Hooks object from all registered hooks,
 * respecting the user's `disabled_hooks` configuration.
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
			// biome-ignore lint/suspicious/noExplicitAny: Hooks interface has heterogeneous value types
			(hooks as any)[entry.key] = handler;
			enabledCount++;
			logVerbose(`Hook registered: ${entry.name} → ${entry.key}`);
		}
	}

	log(`Hooks: ${enabledCount} enabled, ${disabledCount} disabled`);
	return hooks;
}
