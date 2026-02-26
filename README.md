# luthier

**oh-my-opencode gave you a Stratocaster. luthier lets you build your own.**

An [OpenCode](https://opencode.ai) plugin that inherits oh-my-opencode's DNA with full UX customization freedom.

> A luthier is the craftsman who builds and customizes string instruments by hand.
> This plugin is your Custom Shop — same foundation, shaped to your hands.

## Install

Add to your `opencode.json`:

```json
{
  "plugin": ["opencode-luthier"]
}
```

Restart OpenCode. Done.

## Configure

luthier reads configuration from two locations (project overrides user):

- **User-level**: `~/.config/opencode/luthier.jsonc`
- **Project-level**: `.opencode/luthier.jsonc`

Both files support JSONC (JSON with comments). Zero config is valid — sensible defaults are applied.

```jsonc
{
  // Disable specific hooks by name
  "disabled_hooks": [],

  // Override agent settings (model, temperature, system prompt)
  "agents": {
    "oracle": {
      "model": "claude-sonnet-4-20250514",
      "temperature": 0.3
    }
  },

  // Enable/disable tools
  "tools": {
    "disabled": ["tmux"]
  },

  // Session lifecycle tracking
  "session_tracking": {
    "enabled": true,
    "logLevel": "minimal"  // "silent" | "minimal" | "verbose"
  }
}
```

## Project Structure

```
luthier/
├── src/
│   ├── index.ts              # Plugin entry point
│   ├── config/
│   │   ├── schema.ts         # Zod-based config schema
│   │   └── loader.ts         # JSONC config loader (user + project merge)
│   ├── hooks/
│   │   └── event-tracker.ts  # Session lifecycle event hook
│   ├── shared/
│   │   └── log.ts            # Logging utility
│   └── tools/                # Custom tools (coming soon)
├── package.json
├── tsconfig.json
├── biome.json
└── LICENSE
```

## Development

```bash
# Install dependencies
bun install

# Build
bun run build

# Type check
bun run typecheck

# Lint
bun run lint

# Lint + auto-fix
bun run lint:fix
```

## Philosophy

oh-my-opencode is a great Stratocaster — reliable, powerful, well-built.

luthier is the Custom Shop. Same pickups, same wood, same DNA. But every knob, every fret, every finish is chosen by **you**.

- **Agent overrides**: choose your model, temperature, and system prompt per agent
- **Hook control**: enable or disable any hook
- **Tool selection**: whitelist or blacklist tools
- **Dual config**: user-level defaults + project-level overrides

The best setup is the one you never have to fight.

## Roadmap

- [ ] Agent orchestration (Categories × Skills)
- [ ] Custom tool registration
- [ ] Hook composition system
- [ ] Theme/TUI customization
- [ ] MCP server integration
- [ ] Session persistence

## License

MIT
