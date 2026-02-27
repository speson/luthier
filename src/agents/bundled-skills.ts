import type { Skill } from "./skill-loader.js";

/**
 * Built-in skill definitions bundled with luthier.
 * These are available without any user-created .md files.
 * User .md skill files with the same name will override these.
 */
export const BUNDLED_SKILLS: Record<string, Omit<Skill, "sourcePath">> = {
	playwright: {
		name: "playwright",
		description:
			"MUST USE for any browser-related tasks. Browser automation via Playwright MCP \u2014 verification, browsing, information gathering, web scraping, testing, screenshots, and all browser interactions.",
		triggers: [
			"browser",
			"playwright",
			"screenshot",
			"scrape",
			"navigate",
			"click",
			"fill form",
			"test website",
			"web automation",
		],
		body: `# Playwright Skill

You have access to browser automation through the Playwright MCP server.

## When to Use
Use Playwright for ANY task involving:
- Taking screenshots of web pages
- Testing web application behavior
- Scraping or extracting web content
- Verifying UI changes
- Filling forms and interacting with pages

## How to Use
Always prefer Playwright MCP tools over curl/fetch for browser tasks:
- Use \`playwright_navigate\` to open URLs
- Use \`playwright_screenshot\` to capture visual state
- Use \`playwright_click\`, \`playwright_fill\` for interactions
- Use \`playwright_evaluate\` for JavaScript execution

## Rules
- ALWAYS capture a screenshot as evidence after UI changes
- Use headless mode for non-interactive tasks
- Close browser sessions when done`,
	},
	"git-master": {
		name: "git-master",
		description:
			"MUST USE for ANY git operations. Atomic commits, rebase/squash, history search (blame, bisect, log -S).",
		triggers: [
			"commit",
			"rebase",
			"squash",
			"git",
			"blame",
			"bisect",
			"stash",
			"cherry-pick",
			"merge",
			"branch",
			"who wrote",
			"when was",
			"find the commit",
		],
		body: `# Git Master Skill

You are a git operations expert. Follow these rules for ALL git operations.

## Commit Protocol
1. ALWAYS run \`git status\` before committing
2. NEVER commit files with secrets (.env, credentials)
3. NEVER skip pre-commit hooks (--no-verify)
4. Write commit messages: imperative mood, 50 char subject, blank line, body if needed
5. NEVER force push to main/master

## Atomic Commits
- One logical change per commit
- Stage specific files with \`git add -p\` when changes are mixed
- Verify staged diff with \`git diff --staged\` before committing

## History Search
- \`git log -S "pattern"\` \u2014 find when code was added/removed
- \`git blame -L start,end file\` \u2014 who changed specific lines
- \`git bisect\` \u2014 binary search for regression introduction

## Rebase/Squash
- ALWAYS backup with \`git branch backup/name\` before interactive rebase
- Use \`git rebase -i HEAD~N\` for squashing N commits
- Resolve conflicts with \`git mergetool\` or manually then \`git add\``,
	},
	"frontend-ui-ux": {
		name: "frontend-ui-ux",
		description: "Designer-turned-developer who crafts stunning UI/UX even without design mockups",
		triggers: [
			"ui",
			"ux",
			"frontend",
			"component",
			"responsive",
			"accessibility",
			"css",
			"design",
			"layout",
			"animation",
			"style",
		],
		body: `# Frontend UI/UX Skill

You are a designer-turned-developer. You craft production-quality UI that is beautiful, accessible, and responsive.

## Design Principles
- **Mobile-first**: Start with mobile layout, enhance for larger screens
- **Accessibility first**: ARIA labels, keyboard navigation, focus management, color contrast
- **Performance**: Minimize layout shifts, lazy load images, optimize render paths
- **Consistency**: Use design tokens/variables, not magic numbers

## Component Architecture
- Keep components single-responsibility
- Extract reusable primitives (Button, Input, Modal) before composing
- Use composition over inheritance
- Props should be minimal and well-typed

## CSS/Styling
- Prefer CSS custom properties for theming
- Use logical properties (margin-inline) for RTL support
- Avoid !important \u2014 fix specificity instead
- Test in both light and dark modes

## Accessibility Checklist
- [ ] All interactive elements focusable
- [ ] Labels for all inputs
- [ ] Alt text for all images
- [ ] Color contrast \u2265 4.5:1 for normal text
- [ ] No content only conveyed by color`,
	},
	"dev-browser": {
		name: "dev-browser",
		description:
			"Browser automation with persistent page state. Use when users ask to navigate websites, fill forms, take screenshots, extract web data, test web apps, or automate browser workflows.",
		triggers: [
			"go to",
			"navigate to",
			"open url",
			"click on",
			"fill out",
			"extract from website",
			"scrape",
			"automate browser",
			"test the website",
			"log into",
			"devtools",
			"network tab",
			"console errors",
		],
		body: `# Dev Browser Skill

You have persistent browser state through the dev-browser MCP. Pages stay open between tool calls.

## When to Use
- User asks to "go to [url]" or "navigate to [page]"
- Extracting structured data from web pages
- Testing web app flows end-to-end
- Debugging with DevTools (network, console, sources)
- Screenshots for visual verification

## Key Capabilities
- **Persistent sessions**: Browser state persists \u2014 no need to re-navigate
- **Network inspection**: Monitor API calls, check response payloads
- **Console access**: Catch JavaScript errors in real-time
- **DOM manipulation**: Query and interact with any page element

## DevTools Workflow
1. Open DevTools Network tab before triggering the action
2. Perform the interaction
3. Inspect the captured requests/responses
4. Check Console for errors

## Rules
- Always take a screenshot after navigation to confirm the page loaded
- Use \`evaluate\` for complex DOM queries when direct selectors fail
- Close DevTools panels when not needed to avoid interfering with page layout`,
	},
};
