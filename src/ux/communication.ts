import type { UxConfig } from "../config/schema.js";

/**
 * Build a communication style directive from the ux.communication configuration.
 * Returns empty string when no communication style is configured.
 */
export function buildCommunicationPrompt(ux: UxConfig): string {
	const { communication } = ux;

	// Nothing configured → no injection
	if (!communication.language && !communication.tone && !communication.verbosity) {
		return "";
	}

	const lines: string[] = ["## Communication Style"];

	if (communication.language) {
		lines.push(`Always respond in ${communication.language}.`);
	}

	if (communication.tone) {
		const toneMap: Record<string, string> = {
			professional: "Use a professional, formal tone.",
			casual: "Use a casual, conversational tone.",
			academic: "Use an academic, precise tone with technical detail.",
			terse: "Be extremely terse. Minimum words, maximum information.",
		};
		lines.push(toneMap[communication.tone] ?? `Use a ${communication.tone} tone.`);
	}

	if (communication.verbosity) {
		const verbosityMap: Record<string, string> = {
			concise: "Be concise. Avoid unnecessary preamble and filler.",
			balanced: "Strike a balance between brevity and completeness.",
			detailed: "Be thorough and detailed. Explain reasoning and trade-offs.",
		};
		lines.push(verbosityMap[communication.verbosity] ?? `Verbosity: ${communication.verbosity}.`);
	}

	return lines.join("\n");
}
