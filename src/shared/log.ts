const PREFIX = "[luthier]";

export type LogLevel = "silent" | "minimal" | "verbose";

let currentLevel: LogLevel = "minimal";

export function setLogLevel(level: LogLevel): void {
	currentLevel = level;
}

export function log(message: string, ...args: unknown[]): void {
	if (currentLevel === "silent") return;
	console.log(`${PREFIX} ${message}`, ...args);
}

export function logVerbose(message: string, ...args: unknown[]): void {
	if (currentLevel !== "verbose") return;
	console.log(`${PREFIX} [verbose] ${message}`, ...args);
}

export function logError(message: string, ...args: unknown[]): void {
	if (currentLevel === "silent") return;
	console.error(`${PREFIX} [error] ${message}`, ...args);
}
