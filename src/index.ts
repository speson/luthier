import type { Plugin } from "@opencode-ai/plugin";
import { loadLuthierConfig } from "./config/loader.js";
import { buildHooks } from "./hooks/registry.js";
import { log } from "./shared/log.js";

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

	log("luthier v0.1.0 loaded");

	return buildHooks(config, ctx);
};

export default LuthierPlugin;
