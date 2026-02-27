import type { Plugin } from "@opencode-ai/plugin";
import { loadLuthierConfig } from "./config/loader.js";
import { buildHooks } from "./hooks/registry.js";
import { log } from "./shared/log.js";
import { buildTools } from "./tools/registry.js";

/**
 * luthier — OpenCode Plugin
 *
 * "oh-my-opencode gave you a Stratocaster. luthier lets you build your own."
 *
 * Inherits oh-my-opencode's DNA with full UX customization freedom.
 * Every agent, hook, and tool is configurable by the user.
 */
const LuthierPlugin: Plugin = async (ctx) => {
	const config = loadLuthierConfig(ctx.directory);

	log("luthier v0.3.0 loaded");

	const hooks = buildHooks(config, ctx);
	const tools = buildTools(config, ctx);

	return {
		...hooks,
		...(tools ? { tool: tools } : {}),
	};
};

export default LuthierPlugin;
