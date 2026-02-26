# luthier — Development Plan

> "oh-my-opencode gave you a Stratocaster. luthier lets you build your own."

## Philosophy

oh-my-opencode is a great orchestration layer. luthier inherits its DNA but adds **full UX customization freedom** — the Fender Custom Shop of OpenCode plugins. Every agent, hook, tool, and prompt is user-configurable.

---

## Phase 1: Project Scaffolding ✅

**Status**: Complete

| Deliverable | File | Status |
|-------------|------|--------|
| Plugin entry point | `src/index.ts` | ✅ |
| Zod config schema | `src/config/schema.ts` | ✅ |
| Dual-config loader (user + project JSONC) | `src/config/loader.ts` | ✅ |
| Session event tracking hook | `src/hooks/event-tracker.ts` | ✅ |
| Logging utility | `src/shared/log.ts` | ✅ |
| Build system (Bun + ESM + TypeScript) | `package.json`, `tsconfig.json` | ✅ |
| Linter (Biome) | `biome.json` | ✅ |
| README | `README.md` | ✅ |

**Verified**: `bun install` ✅ `bun run build` ✅ `tsc --noEmit` ✅ `biome check` ✅

---

## Phase 2: Hook Composition System

**Goal**: Users can enable/disable/customize any hook. Modular hook architecture like oh-my-opencode's `createHooks` pattern.

### Deliverables

| Task | Description | Files |
|------|-------------|-------|
| Hook registry | Central registry that discovers, loads, and manages hooks | `src/hooks/registry.ts` |
| Hook enable/disable | Respect `disabled_hooks` config to skip hooks | `src/hooks/registry.ts` |
| Permission hook | Auto-allow/deny based on user config (like oh-my-opencode's trust system) | `src/hooks/permission-handler.ts` |
| Chat message hook | Intercept and transform messages (context injection, directive injection) | `src/hooks/chat-message.ts` |
| Tool execution hooks | `tool.execute.before` / `tool.execute.after` — validate args, truncate output | `src/hooks/tool-interceptor.ts` |
| Shell env hook | Inject environment variables into tool/shell executions | `src/hooks/shell-env.ts` |
| Compaction hook | Custom session compaction logic | `src/hooks/compaction.ts` |

### Config Schema Extensions

```jsonc
{
  "disabled_hooks": ["permission-handler", "shell-env"],
  "hooks": {
    "permission-handler": {
      "auto_allow": ["read", "edit"],
      "auto_deny": ["bash:rm -rf"]
    },
    "chat-message": {
      "inject_context": true,
      "system_directives": ["Always respond in Korean"]
    }
  }
}
```

### Dependencies
- Phase 1 (config system)

---

## Phase 3: Agent Orchestration (Categories × Skills)

**Goal**: Port oh-my-opencode's dynamic agent composition. Users can define custom categories, skills, and agent overrides.

### Deliverables

| Task | Description | Files |
|------|-------------|-------|
| Category system | Define task categories (quick, deep, visual-engineering, ultrabrain) | `src/agents/categories.ts` |
| Skill system | Loadable skill definitions from `.opencode/luthier/skills/` | `src/agents/skills.ts` |
| Skill loader | Discover and load `.md` skill files with YAML frontmatter | `src/agents/skill-loader.ts` |
| Nested skill directories | Support subdirectories for skill organization | `src/agents/skill-loader.ts` |
| Skill enable/disable | Config-driven skill management | `src/config/schema.ts` (extend) |
| Agent prompt builder | Dynamic system prompt composition from category + skills | `src/agents/prompt-builder.ts` |
| Agent override system | Per-agent model/temperature/systemPrompt from config | `src/agents/overrides.ts` |

### Config Schema Extensions

```jsonc
{
  "agents": {
    "oracle": {
      "model": "claude-sonnet-4-20250514",
      "temperature": 0.3,
      "systemPrompt": "You are a senior architect..."
    }
  },
  "categories": {
    "my-custom-category": {
      "model": "gpt-4o",
      "description": "Custom category for data analysis"
    }
  },
  "skills": {
    "directory": ".opencode/luthier/skills",
    "disabled": ["playwright", "dev-browser"]
  }
}
```

### Key Architecture Decisions
- Skills are Markdown files with YAML frontmatter (same as oh-my-opencode)
- Categories map to model selections (abstraction over provider-specific models)
- Dynamic composition: category × skill = runtime agent configuration
- User can add custom categories and skills without touching plugin code

### Dependencies
- Phase 1 (config system)
- Phase 2 (hook composition — agents need hooks for lifecycle)

---

## Phase 4: Custom Tool Registration

**Goal**: Users can register custom tools the AI agent can call. Built-in tools for common operations.

### Deliverables

| Task | Description | Files |
|------|-------------|-------|
| Tool registry | Central registry for built-in and user-defined tools | `src/tools/registry.ts` |
| Tool enable/disable | Config-driven tool filtering | `src/tools/registry.ts` |
| Web search tool | Multi-provider web search (Exa/Tavily, user-selectable) | `src/tools/web-search.ts` |
| Session tools | Session management utilities (list, switch, summarize) | `src/tools/session.ts` |
| User tool loader | Load custom tool definitions from config/files | `src/tools/user-tools.ts` |

### Config Schema Extensions

```jsonc
{
  "tools": {
    "enabled": ["web-search", "session"],
    "disabled": ["tmux"],
    "web_search": {
      "provider": "exa",
      "api_key_env": "EXA_API_KEY"
    }
  }
}
```

### Dependencies
- Phase 1 (config system)
- Phase 2 (tool execution hooks)

---

## Phase 5: MCP Server Integration

**Goal**: Bundled MCP servers with zero-config setup. Users can add/remove MCP servers via config.

### Deliverables

| Task | Description | Files |
|------|-------------|-------|
| MCP config schema | Define MCP server entries in luthier config | `src/mcp/schema.ts` |
| Bundled servers | Context7, grep.app pre-configured | `src/mcp/bundled.ts` |
| OAuth 2.1 support | RFC-compliant auth for MCP servers | `src/mcp/oauth.ts` |
| User MCP servers | Custom MCP server definitions via config | `src/mcp/loader.ts` |

### Config Schema Extensions

```jsonc
{
  "mcp": {
    "bundled": {
      "context7": { "enabled": true },
      "grep_app": { "enabled": true }
    },
    "custom": [
      {
        "name": "my-server",
        "url": "http://localhost:3000",
        "auth": "oauth"
      }
    ]
  }
}
```

### Dependencies
- Phase 1 (config system)

---

## Phase 6: Session & State Management

**Goal**: Session persistence, recovery, and tracking beyond the basic event hook.

### Deliverables

| Task | Description | Files |
|------|-------------|-------|
| Session state store | Persist session metadata (SQLite via bun:sqlite) | `src/state/session-store.ts` |
| Session recovery | Resume interrupted sessions | `src/hooks/session-recovery.ts` |
| Session metrics | Track token usage, duration, tool calls per session | `src/state/metrics.ts` |
| Todo continuation | Prevent agent from stopping with incomplete tasks | `src/hooks/todo-continuation.ts` |
| Context monitor | Track context window usage, warn on limits | `src/hooks/context-monitor.ts` |

### Dependencies
- Phase 2 (hook system)
- Phase 4 (tool registry — for metrics)

---

## Phase 7: TUI & UX Customization

**Goal**: The "Custom Shop" differentiator — users can customize the visual/interactive experience.

### Deliverables

| Task | Description | Files |
|------|-------------|-------|
| Toast notifications | User-configurable toast messages for events | `src/tui/toast.ts` |
| Status bar | Session status, metrics, active mode display | `src/tui/status.ts` |
| Tmux integration | Sidebar dashboard, parallel execution panes | `src/tui/tmux.ts` |
| Notification system | Desktop/Discord/Slack/Telegram on completion | `src/features/notify.ts` |
| Theme config | Customizable colors, icons, formatting | `src/tui/theme.ts` |

### Config Schema Extensions

```jsonc
{
  "tui": {
    "toast": { "enabled": true, "duration": 3000 },
    "tmux": { "sidebar": true, "width": 40 },
    "theme": {
      "prefix": "[luthier]",
      "colors": { "success": "green", "error": "red" }
    }
  },
  "notifications": {
    "on_complete": true,
    "channels": [
      { "type": "discord", "webhook": "$DISCORD_WEBHOOK_URL" }
    ]
  }
}
```

### Dependencies
- Phase 1 (config system)
- Phase 6 (session state — for status display)

---

## Phase 8: Quality & Validation

**Goal**: Port oh-my-opencode's "Atlas Trusts No One" philosophy — verification and quality gates.

### Deliverables

| Task | Description | Files |
|------|-------------|-------|
| Validation hook | Verify sub-agent results before accepting | `src/hooks/validation-gate.ts` |
| Quality scorer | Track edit success rate, build health, test health | `src/quality/scorer.ts` |
| Failure playbook | Error-type-specific recovery suggestions | `src/quality/failure-playbook.ts` |
| Circuit breaker | Stop after N consecutive failures | `src/quality/circuit-breaker.ts` |
| Code simplifier | Detect and warn on AI slop patterns | `src/hooks/code-simplifier.ts` |

### Dependencies
- Phase 2 (hook system)
- Phase 6 (session state — for score tracking)

---

## Phase 9: Documentation & Publishing

**Goal**: Polish for public release on npm.

### Deliverables

| Task | Description |
|------|-------------|
| Full README | Installation, all config options, examples, migration guide |
| API docs | TypeDoc or similar for public API |
| Config reference | Complete JSONC config schema with all options documented |
| Contributing guide | How to add hooks, tools, skills |
| npm publish | `opencode-luthier` on npm registry |
| GitHub Actions CI | Build + typecheck + lint + test on PR |
| Changelog | CHANGELOG.md with semantic versioning |

### Dependencies
- All previous phases

---

## Phase Priority & Execution Order

```
Phase 1 ✅ Scaffolding          [DONE]
  │
  ├── Phase 2: Hook Composition  [NEXT — foundation for everything]
  │     │
  │     ├── Phase 3: Agent Orchestration
  │     │     │
  │     │     └── Phase 8: Quality & Validation
  │     │
  │     ├── Phase 4: Custom Tools
  │     │
  │     └── Phase 6: Session & State
  │           │
  │           └── Phase 7: TUI & UX
  │
  ├── Phase 5: MCP Integration   [independent]
  │
  └── Phase 9: Documentation     [final polish]
```

### Recommended Sprint Plan

| Sprint | Phase | Estimated Effort | Key Outcome |
|--------|-------|-----------------|-------------|
| Sprint 1 | Phase 2 | 1-2 days | Hook system working, permission handler done |
| Sprint 2 | Phase 3 | 2-3 days | Categories × Skills dynamic agents |
| Sprint 3 | Phase 4 | 1-2 days | Web search tool, tool registry |
| Sprint 4 | Phase 5 | 1 day | MCP servers bundled |
| Sprint 5 | Phase 6 | 2-3 days | Session persistence, todo continuation |
| Sprint 6 | Phase 7 | 2-3 days | TUI customization, notifications |
| Sprint 7 | Phase 8 | 2-3 days | Validation gates, quality scoring |
| Sprint 8 | Phase 9 | 1-2 days | npm publish, CI/CD, docs |

**Total estimated: ~2-3 weeks for full feature parity + customization layer**

---

## Architecture Overview

```
opencode-luthier/
├── src/
│   ├── index.ts                 # Plugin entry point
│   ├── config/
│   │   ├── schema.ts            # Zod config schema (all options)
│   │   └── loader.ts            # JSONC config loader
│   ├── agents/
│   │   ├── categories.ts        # Category definitions
│   │   ├── skills.ts            # Skill system
│   │   ├── skill-loader.ts      # .md skill file discovery
│   │   ├── prompt-builder.ts    # Dynamic prompt composition
│   │   └── overrides.ts         # Per-agent config overrides
│   ├── hooks/
│   │   ├── registry.ts          # Hook discovery & management
│   │   ├── event-tracker.ts     # Session lifecycle events ✅
│   │   ├── permission-handler.ts # Auto-allow/deny
│   │   ├── chat-message.ts      # Message interception
│   │   ├── tool-interceptor.ts  # Tool arg/output modification
│   │   ├── shell-env.ts         # Env var injection
│   │   ├── compaction.ts        # Session compaction
│   │   ├── validation-gate.ts   # Sub-agent verification
│   │   ├── todo-continuation.ts # Prevent premature stops
│   │   ├── session-recovery.ts  # Resume interrupted sessions
│   │   ├── context-monitor.ts   # Context window tracking
│   │   └── code-simplifier.ts   # AI slop detection
│   ├── tools/
│   │   ├── registry.ts          # Tool discovery & filtering
│   │   ├── web-search.ts        # Exa/Tavily web search
│   │   ├── session.ts           # Session management
│   │   └── user-tools.ts        # User-defined tool loader
│   ├── mcp/
│   │   ├── schema.ts            # MCP config types
│   │   ├── bundled.ts           # Pre-configured servers
│   │   ├── oauth.ts             # OAuth 2.1 support
│   │   └── loader.ts            # User MCP server loader
│   ├── quality/
│   │   ├── scorer.ts            # Quality score tracking
│   │   ├── failure-playbook.ts  # Error recovery strategies
│   │   └── circuit-breaker.ts   # Failure escalation
│   ├── state/
│   │   ├── session-store.ts     # SQLite session persistence
│   │   └── metrics.ts           # Usage metrics tracking
│   ├── tui/
│   │   ├── toast.ts             # Toast notifications
│   │   ├── status.ts            # Status bar
│   │   ├── tmux.ts              # Tmux sidebar
│   │   └── theme.ts             # Visual customization
│   ├── features/
│   │   └── notify.ts            # External notifications
│   └── shared/
│       └── log.ts               # Logging utility ✅
```

---

## What Makes luthier Different from oh-my-opencode

| Aspect | oh-my-opencode | luthier |
|--------|---------------|---------|
| Agent config | Hardcoded defaults | User-overridable per agent |
| Hook management | All-or-nothing | Individual enable/disable |
| Skill organization | Flat directory | Nested + disable by name |
| Tool selection | Bundle all | Whitelist/blacklist |
| Prompt templates | Fixed | User-customizable |
| MCP servers | Bundled only | Bundled + user-defined |
| TUI | Fixed layout | Configurable theme/layout |
| Config format | JSONC, limited | JSONC, comprehensive, documented |
| Philosophy | Batteries included | **Batteries included, but every battery is replaceable** |
