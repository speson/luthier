import type { UxConfig } from "../config/schema.js";

/**
 * Build a persona prompt fragment from the ux.persona configuration.
 * Returns empty string when no persona is configured.
 */
export function buildPersonaPrompt(ux: UxConfig): string {
	const { persona } = ux;

	// Nothing configured → no injection
	if (!persona.name && !persona.role && persona.traits.length === 0) {
		return "";
	}

	const lines: string[] = ["## Persona"];

	if (persona.name) {
		lines.push(`Your name is ${persona.name}.`);
	}
	if (persona.role) {
		lines.push(`Your role: ${persona.role}.`);
	}
	if (persona.traits.length > 0) {
		lines.push(`Your traits: ${persona.traits.join(", ")}.`);
	}

	return lines.join("\n");
}
