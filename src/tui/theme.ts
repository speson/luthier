import type { LuthierConfig } from "../config/schema.js";

/**
 * Resolved theme values for use throughout the plugin.
 *
 * The theme system is the "Custom Shop" differentiator —
 * users customize the look and feel of luthier's output.
 */
export interface ResolvedTheme {
	prefix: string;
	colors: {
		success: string;
		warning: string;
		error: string;
		info: string;
	};
}

/**
 * Resolve the theme from config, merging with defaults.
 */
export function resolveTheme(config: LuthierConfig): ResolvedTheme {
	const themeConfig = config.tui.theme;
	return {
		prefix: themeConfig.prefix,
		colors: {
			success: themeConfig.colors.success,
			warning: themeConfig.colors.warning,
			error: themeConfig.colors.error,
			info: themeConfig.colors.info,
		},
	};
}

/**
 * ANSI color code mapping for terminal output.
 */
const ANSI_COLORS: Record<string, string> = {
	black: "\x1b[30m",
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	magenta: "\x1b[35m",
	cyan: "\x1b[36m",
	white: "\x1b[37m",
	reset: "\x1b[0m",
};

/**
 * Colorize text using ANSI codes.
 * Falls back to uncolored text if color name is unknown.
 */
export function colorize(text: string, color: string): string {
	const code = ANSI_COLORS[color];
	if (!code) return text;
	return `${code}${text}${ANSI_COLORS.reset}`;
}
