import type { Skill } from "./skill-loader.js";

/**
 * Build a skill instruction block for injection into system prompts.
 *
 * Format:
 * ```
 * <skill name="git-master">
 * MUST USE for ANY git operations...
 * </skill>
 * ```
 *
 * This follows oh-my-opencode's pattern where skills are wrapped
 * in XML-like tags for clear LLM instruction boundaries.
 */
function formatSkillBlock(skill: Skill): string {
	const header = skill.description ? `(Skill) ${skill.description}` : "(Skill)";
	const triggers = skill.triggers.length > 0 ? `\nTriggers: ${skill.triggers.join(", ")}` : "";

	return `<skill name="${skill.name}">
${header}${triggers}

${skill.body}
</skill>`;
}

/**
 * Build a skills summary section listing all available skills.
 *
 * This gives the agent an overview of what skills are loaded,
 * so it knows what capabilities are available.
 */
function formatSkillsSummary(skills: Skill[]): string {
	if (skills.length === 0) return "";

	const lines = skills.map((s) => {
		const desc = s.description ? ` — ${s.description}` : "";
		return `  - ${s.name}${desc}`;
	});

	return `<available_skills>
${lines.join("\n")}
</available_skills>`;
}

/**
 * Compose the full skill injection for the system prompt.
 *
 * Includes:
 *   1. A summary of all available skills
 *   2. Full instruction blocks for each loaded skill
 *
 * Returns an array of strings to push into the system prompt array.
 */
export function buildSkillPrompts(skills: Map<string, Skill>): string[] {
	if (skills.size === 0) return [];

	const allSkills = Array.from(skills.values());
	const parts: string[] = [];

	// Summary of available skills
	const summary = formatSkillsSummary(allSkills);
	if (summary) {
		parts.push(summary);
	}

	// Full skill instruction blocks
	for (const skill of allSkills) {
		if (skill.body.trim()) {
			parts.push(formatSkillBlock(skill));
		}
	}

	return parts;
}

/**
 * Find skills relevant to a user message based on trigger matching.
 *
 * Used for selective skill injection — only inject skills whose
 * triggers match the current conversation context.
 */
export function findRelevantSkills(skills: Map<string, Skill>, messageText: string): Skill[] {
	const lowerMessage = messageText.toLowerCase();

	return Array.from(skills.values()).filter((skill) =>
		skill.triggers.some((trigger) => lowerMessage.includes(trigger.toLowerCase())),
	);
}
