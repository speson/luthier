# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[0.1.0]: https://github.com/speson/luthier/releases/tag/v0.1.0
