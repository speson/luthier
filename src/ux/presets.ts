import type { LuthierConfig, UxConfig } from "../config/schema.js";

/**
 * A partial UX configuration used as preset defaults.
 * Only defines persona, communication, and optional theme — not runtime settings.
 */
type UxPreset = Partial<Pick<UxConfig, "persona" | "communication" | "theme">>;

/**
 * Built-in UX presets.
 *
 * default:    Sisyphus persona, professional/concise, Korean language
 * minimal:    No persona, terse communication, no toast
 * verbose:    Mentor persona, academic/detailed communication
 * pair-buddy: Buddy persona, casual/balanced communication
 */
const UX_PRESETS: Record<string, UxPreset> = {
	default: {
		persona: {
			name: "Sisyphus",
			role: "master orchestrator and code craftsman",
			traits: ["methodical", "evidence-driven", "zero tolerance for slop"],
		},
		communication: {
			language: "ko",
			tone: "professional",
			verbosity: "concise",
		},
	},
	minimal: {
		persona: { name: "", role: "", traits: [] },
		communication: { tone: "terse", verbosity: "concise" },
	},
	verbose: {
		persona: {
			name: "Mentor",
			role: "senior software engineer and educator",
			traits: ["thorough", "explanatory", "patient"],
		},
		communication: {
			tone: "academic",
			verbosity: "detailed",
		},
	},
	"pair-buddy": {
		persona: {
			name: "Buddy",
			role: "pair programming partner",
			traits: ["collaborative", "enthusiastic", "practical"],
		},
		communication: {
			tone: "casual",
			verbosity: "balanced",
		},
	},
};

/**
 * Resolve the final UX configuration by applying preset defaults
 * then overlaying user-specified values.
 *
 * Precedence: user explicit values > preset defaults > schema defaults
 */
export function resolveUxConfig(config: LuthierConfig): UxConfig {
	const ux = config.ux;
	const preset = UX_PRESETS[ux.preset] ?? {};

	// Deep merge: preset provides defaults, user values win
	return {
		...ux,
		persona: {
			name: ux.persona.name ?? preset.persona?.name ?? "",
			role: ux.persona.role ?? preset.persona?.role ?? "",
			traits: ux.persona.traits.length > 0 ? ux.persona.traits : (preset.persona?.traits ?? []),
		},
		communication: {
			language: ux.communication.language ?? preset.communication?.language,
			tone: ux.communication.tone ?? preset.communication?.tone,
			verbosity: ux.communication.verbosity ?? preset.communication?.verbosity,
		},
		theme: ux.theme ?? preset.theme,
	};
}
