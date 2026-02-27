/**
 * Lightweight template engine for prompt fragments.
 *
 * Supports:
 *   - Variable interpolation: {{path.to.value}}
 *   - Conditional blocks: {{#if path.to.value}}...{{/if}}
 *   - Negative conditionals: {{#unless path.to.value}}...{{/unless}}
 *   - Nested access: {{config.ux.persona.name}}
 *
 * No external dependencies. Designed for prompt template rendering,
 * not general-purpose templating.
 */

export type TemplateContext = Record<string, unknown>;

/**
 * Resolve a dotted path (e.g. "config.ux.persona.name") from a context object.
 * Returns undefined if any segment is missing.
 */
export function resolvePath(context: TemplateContext, path: string): unknown {
	let current: unknown = context;
	for (const segment of path.split(".")) {
		if (current === null || current === undefined) return undefined;
		if (typeof current !== "object") return undefined;
		current = (current as Record<string, unknown>)[segment];
	}
	return current;
}

/**
 * Check if a value is "truthy" for template conditional purposes.
 * Empty arrays and empty strings are falsy. Everything else follows JS truthiness.
 */
function isTruthy(value: unknown): boolean {
	if (Array.isArray(value)) return value.length > 0;
	if (typeof value === "string") return value.length > 0;
	return Boolean(value);
}

/**
 * Process {{#if path}}...{{/if}} and {{#unless path}}...{{/unless}} blocks.
 * Supports nesting.
 */
function processConditionals(template: string, context: TemplateContext): string {
	// Process {{#if}} blocks (innermost first to handle nesting)
	let result = template;
	let safety = 0;
	const maxIterations = 100;

	// Process {{#if}}...{{/if}} — innermost first (body must not contain nested {{#if}})
	while (result.includes("{{#if ") && safety < maxIterations) {
		safety++;
		const replaced = result.replace(
			/\{\{#if\s+([^}]+)\}\}((?:(?!\{\{#(?:if|unless)\s)[\s\S])*?)\{\{\/if\}\}/,
			(_match, path: string, body: string) => {
				const value = resolvePath(context, path.trim());
				return isTruthy(value) ? body : "";
			},
		);
		if (replaced === result) break;
		result = replaced;
	}

	safety = 0;
	// Process {{#unless}}...{{/unless}}
	while (result.includes("{{#unless ") && safety < maxIterations) {
		safety++;
		const replaced = result.replace(
			/\{\{#unless\s+([^}]+)\}\}((?:(?!\{\{#(?:if|unless)\s)[\s\S])*?)\{\{\/unless\}\}/,
			(_match, path: string, body: string) => {
				const value = resolvePath(context, path.trim());
				return isTruthy(value) ? "" : body;
			},
		);
		if (replaced === result) break;
		result = replaced;
	}

	return result;
}

/**
 * Replace {{path.to.value}} with the resolved value from context.
 * Unresolved variables are replaced with empty string.
 */
function interpolateVariables(template: string, context: TemplateContext): string {
	return template.replace(/\{\{([^#/][^}]*)\}\}/g, (_match, path: string) => {
		const value = resolvePath(context, path.trim());
		if (value === undefined || value === null) return "";
		if (typeof value === "object") return JSON.stringify(value);
		return String(value);
	});
}

/**
 * Clean up artifacts: collapse multiple blank lines, trim leading/trailing whitespace.
 */
function cleanOutput(text: string): string {
	return text.replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Render a template string with the given context.
 *
 * Processing order:
 *   1. Conditional blocks ({{#if}}, {{#unless}})
 *   2. Variable interpolation ({{path}})
 *   3. Output cleanup (collapse blank lines)
 */
export function renderTemplate(template: string, context: TemplateContext): string {
	let result = processConditionals(template, context);
	result = interpolateVariables(result, context);
	result = cleanOutput(result);
	return result;
}
