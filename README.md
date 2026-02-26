# opencode-luthier

**oh-my-opencode gave you a Stratocaster. luthier lets you build your own.**

A luthier is the craftsman who builds and customizes string instruments by hand. This plugin is your Custom Shop — same foundation, shaped to your hands. It inherits the DNA of oh-my-opencode while providing full UX customization freedom.

## Installation

Add `opencode-luthier` to your `opencode.json` plugins array:

```json
{
  "plugins": ["opencode-luthier"]
}
```

Restart OpenCode to apply the changes.

## Configuration

luthier uses a dual-config system where project-level settings override user-level defaults. Both files support JSONC (JSON with comments).

- **User-level**: `~/.config/opencode/luthier.jsonc`
- **Project-level**: `.opencode/luthier.jsonc`

Zero config is valid. The plugin works out of the box with sensible defaults.

### Complete Configuration Example

```jsonc
{
  // List of hooks to disable by name
  "disabled_hooks": [],

  "hooks": {
    "permission-handler": {
      "auto_allow": ["Read", "bash:ls *"],
      "auto_deny": ["bash:rm -rf /"]
    },
    "chat-message": {
      "inject_context": true,
      "system_directives": ["Always use technical terminology", "Be concise"]
    },
    "tool-interceptor": {
      "max_output_length": 5000,
      "truncation_exempt": ["read", "grep"],
      "blocked_tools": []
    },
    "shell-env": {
      "vars": { "DEBUG": "true" },
      "forward": ["PATH", "HOME"]
    },
    "compaction": {
      "context": ["Keep the project architecture in mind"],
      "prompt": "Summarize the session focusing on architectural decisions."
    }
  },

  // Override settings for specific agents
  "agents": {
    "oracle": {
      "model": "claude-3-5-sonnet-20240620",
      "temperature": 0.5,
      "systemPrompt": "You are a senior software architect."
    }
  },

  // Define or override task categories
  "categories": {
    "deep": {
      "model": "gpt-4o",
      "temperature": 0.2,
      "description": "Complex reasoning and architectural analysis"
    }
  },

  "skills": {
    "directory": ".opencode/luthier/skills",
    "disabled": ["legacy-skill"],
    "extra_directories": ["~/shared-skills"]
  },

  "tools": {
    "enabled": ["web_search", "session_info"],
    "disabled": ["tmux"],
    "web_search": {
      "provider": "exa",
      "api_key_env": "EXA_API_KEY",
      "max_results": 10
    }
  },

  "mcp": {
    "bundled": {
      "context7": { "enabled": true },
      "grep-app": { "enabled": true }
    },
    "custom": [
      {
        "name": "my-local-server",
        "type": "local",
        "command": ["node", "server.js"],
        "environment": { "PORT": "3000" }
      }
    ]
  },

  "tui": {
    "toast": {
      "enabled": true,
      "duration": 3000
    },
    "theme": {
      "prefix": "[luthier]",
      "colors": {
        "success": "green",
        "info": "blue"
      }
    }
  },

  "notifications": {
    "on_complete": true,
    "on_error": true,
    "channels": [
      {
        "type": "discord",
        "webhook": "$DISCORD_WEBHOOK_URL"
      }
    ]
  },

  "session_tracking": {
    "enabled": true,
    "logLevel": "minimal"
  },

  "experimental": {
    "validation_gate.enabled": true,
    "code_simplifier.enabled": false,
    "circuit_breaker_threshold": 5
  }
}
```

## Hooks

luthier provides 22 hooks to intercept and modify OpenCode behavior. You can enable or disable them individually.

| Hook Name | Description |
| :--- | :--- |
| `event-tracker` | Tracks session lifecycle events (start, end, error). |
| `permission-handler` | Manages tool execution permissions with auto-allow/deny rules. |
| `chat-message` | Intercepts and modifies user and assistant messages. |
| `system-directives` | Injects user-defined directives into the system prompt. |
| `agent-overrides` | Applies per-agent model and parameter overrides. |
| `agent-system` | Injects loaded skills into the agent system prompt. |
| `tool-interceptor-before` | Modifies tool arguments before execution. |
| `tool-interceptor-after` | Processes tool output before returning it to the agent. |
| `shell-env` | Injects environment variables into shell tool executions. |
| `compaction` | Customizes the session history compaction process. |
| `metrics-event` | Records custom event metrics. |
| `metrics-tool` | Records tool usage statistics. |
| `metrics-message` | Records message-related metrics. |
| `todo-continuation` | Prevents the agent from stopping with incomplete todos. |
| `context-monitor` | Tracks message count and warns when approaching context limits. |
| `session-recovery` | Injects previous session context when resuming work. |
| `toast` | Displays TUI toast notifications for plugin events. |
| `notifications` | Sends external notifications (Slack, Discord, Webhooks). |
| `mcp-config` | Configures Model Context Protocol server connections. |
| `circuit-breaker` | Monitors consecutive tool failures and injects recovery guidance after a threshold. |
| `validation-gate` | (Experimental) Injects verification requirements into the system prompt, stronger as quality degrades. |
| `code-simplifier` | (Experimental) Detects AI slop patterns (`as any`, `@ts-ignore`, empty catch) and appends warnings. |

## Agent Orchestration

### Categories

Categories define the model and parameters used for different types of tasks. luthier supports 8 default categories:

| Category | Description |
| :--- | :--- |
| `quick` | Fast, low-latency responses for simple queries. |
| `deep` | High-reasoning models for complex logic and architecture. |
| `ultrabrain` | Maximum intelligence models for the hardest problems. |
| `visual-engineering` | Models optimized for UI/UX and frontend tasks. |
| `artistry` | Complex problem-solving with unconventional, creative approaches. |
| `writing` | Technical documentation and README generation. |
| `unspecified-low` | Default for low-priority background tasks. |
| `unspecified-high` | Default for high-priority interactive tasks. |

### Skills

Skills are specialized instructions triggered by specific keywords or phrases. They are defined as Markdown files with YAML frontmatter.

**Example Skill File (`.opencode/luthier/skills/refactor.md`):**

```markdown
---
name: refactor
description: Intelligent code refactoring
triggers: ["refactor this", "clean up this function"]
---
You are a refactoring expert. Focus on SOLID principles and readability.
```

## Custom Tools

luthier adds specialized tools to the OpenCode environment:

- **Web Search**: Integrated search via Exa or Tavily.
- **Session Info**: Provides metadata about the current session state and configuration.

## MCP Server Integration

luthier bundles pre-configured MCP servers and allows adding custom ones.

- **Context7**: Deep documentation and code example search.
- **grep.app**: Search across millions of public GitHub repositories.

Custom servers can be `local` (running as a subprocess) or `remote` (connecting via HTTP).

## Session Management

- **Lifecycle Tracking**: Monitor session start, completion, and errors.
- **Recovery**: Automatic state restoration if the process is interrupted.
- **Compaction Control**: Fine-tune how history is summarized to save tokens.

## Quality & Validation

- **Validation Gate**: (Experimental) Injects verification requirements into the system prompt; becomes stricter as quality degrades.
- **Circuit Breaker**: Monitors consecutive tool failures and injects recovery guidance after a configurable threshold.
- **Code Simplifier**: (Experimental) Detects AI slop patterns (`as any`, `@ts-ignore`, empty catch blocks, bare TODOs) and appends warnings.

## TUI Customization

Customize the look and feel of luthier's output in the terminal.

- **Toasts**: Non-intrusive status updates.
- **Themes**: Custom prefixes and color schemes for different log levels (success, info, warning, error).

## Project Structure

```
luthier/
├── src/
│   ├── index.ts              # Plugin entry point
│   ├── config/
│   │   ├── schema.ts         # Zod-based config schema
│   │   └── loader.ts         # JSONC config loader
│   ├── hooks/                # Hook implementations
│   ├── shared/               # Shared utilities (log, etc.)
│   └── tools/                # Custom tool implementations
├── package.json
├── tsconfig.json
└── LICENSE
```

## Development

```bash
# Install dependencies
bun install

# Build the plugin
bun run build

# Run tests
bun test

# Lint and format
bun run lint
```

## Contributing

### Adding a Hook
1. Define the hook logic in `src/hooks/`.
2. Register the hook in `src/hooks/registry.ts`.
3. Add any necessary config options to `src/config/schema.ts`.

### Adding a Tool
1. Implement the tool logic in `src/tools/`.
2. Register the tool in `src/tools/registry.ts`.

### Adding a Skill
1. Create a new `.md` file in your skills directory.
2. Define the `name`, `description`, and `triggers` in the YAML frontmatter.

## License

MIT

---

GitHub: [https://github.com/speson/luthier](https://github.com/speson/luthier)
NPM: `opencode-luthier`
