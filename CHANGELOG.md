# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-02-27

### Added

- Prompt template engine with `{{var}}` interpolation, `{{#if}}`/`{{#unless}}` conditional blocks, and nested block support
- Template context builder exposing project, config, env (safe-filtered), platform, and date variables
- Custom prompt module system: user-defined `.md` files with YAML frontmatter loaded from configurable directories
- Custom modules support priority-based ordering, per-module enable/disable, nested directories, and duplicate name override
- Config schema extended with `modules.custom` (directory, extra_directories, disabled) and `modules.templates_enabled`
- Module registry and assembler updated to merge built-in + custom modules with template rendering
- Integration tests: plugin loading E2E, hook chaining composition, config loading scenarios (74 new tests, 234 total)

## [0.1.0] - 2026-02-26

### Added

- Plugin entry point with dual JSONC configuration support (user-level and project-level configs)
- Hook composition system with 22 configurable hooks and disabled_hooks filtering capability
- Agent orchestration with 8 categories, skill loader supporting markdown files with YAML frontmatter, and per-agent configuration overrides (model, temperature, systemPrompt)
- Custom tool registration with whitelist and blacklist filtering, web search integration (Exa and Tavily), and session info tool
- MCP server integration with bundled Context7 and grep.app servers, plus support for custom remote and local servers
- Session state management with SQLite persistence, metrics tracking, todo continuation, context monitoring, and session recovery
- TUI customization with toast notifications, theme system, and external notifications (Discord, Slack, webhook)
- Quality validation with circuit breaker, validation gate, code simplifier for AI slop detection, and failure playbook

[0.2.0]: https://github.com/speson/luthier/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/speson/luthier/releases/tag/v0.1.0
