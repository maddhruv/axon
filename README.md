<p align="center">
  <img src="logo.png" alt="Axon" width="200" />
</p>

<h1 align="center">Axon</h1>

<p align="center">
  <strong>AI memory engine for coding agents</strong>
</p>

<p align="center">
  Like a brain for your AI - remembers corrections, preferences, conventions, and decisions across conversations.
</p>

---

## What is Axon?

Axon gives AI coding agents (like Claude Code) persistent memory that survives across conversations. Instead of starting every session from scratch, your AI remembers your coding style, project conventions, past decisions, and lessons learned.

**Two-tier architecture:**
- **CLAUDE.md briefing** - A curated summary loaded automatically on every conversation. This is how memories reach your AI.
- **`.axon/` archive** - All raw memories stored as markdown files with a BM25 search index. The long-term store.

**How it works:**
1. You correct your AI: "No, never use semicolons in this project"
2. AI suggests remembering it: `Should I remember this?`
3. You say yes, memory gets stored via `axon remember`
4. On consolidation, the briefing in CLAUDE.md gets regenerated
5. Next conversation, your AI already knows - no reminders needed

## Quick Start

```bash
# Install globally
npm install -g axon-ai

# One-time setup (installs Claude Code hooks + skill)
axon setup

# Initialize in a project
cd your-project
axon init
```

That's it. Start a Claude Code session and your AI has memory.

## Commands

### Brain Dump Mode

Just run `axon` with no arguments to enter brain dump mode - an interactive editor for capturing thoughts.

```
$ axon

  axon - brain dump mode
  Type your thoughts. Double-Enter to save. /help for commands. Ctrl+C to quit.

  > Auth uses JWT with refresh tokens #auth #jwt
  >
  Saved: ax_abc123 (tags: auth, jwt)

  > /recall auth
  Auth uses JWT with refresh tokens

  > /help
  /recall <query>  - search memories
  /forget <id>     - delete a memory
  /briefing        - show memory briefing
  /status          - show memory counts
  /help            - show this help
```

Features:
- `#hashtags` auto-extract as tags
- Double-Enter saves a memory
- Slash commands for search, delete, status
- Up/Down arrows for input history
- Tab to autocomplete commands

### CLI Commands

```bash
axon                           # brain dump mode (interactive)
axon remember "some fact"      # store a memory
axon remember                  # interactive wizard
axon recall "search query"     # BM25 search
axon recall --recent 10        # recent memories
axon recall --tags "auth"      # filter by tags
axon forget <id>               # delete a memory
axon forget                    # interactive selector
axon status                    # memory counts + category breakdown
axon briefing                  # show current CLAUDE.md briefing
axon reindex                   # rebuild search index
axon init                      # init project memory (.axon/)
axon setup                     # one-time Claude Code integration
```

## How Memory is Stored

Memories are plain markdown files with YAML frontmatter:

```markdown
---
id: ax_R8YgT5fmK5
tags: [auth, jwt, security]
category: convention
created: '2026-03-19T10:00:00Z'
updated: '2026-03-19T10:00:00Z'
accessed: '2026-03-19T10:00:00Z'
accessCount: 3
summary: Auth uses JWT with refresh tokens
---

Auth uses JWT with refresh tokens in httpOnly cookies.
Access tokens expire in 15 minutes.
Refresh endpoint at POST /api/auth/refresh.
```

**Human-readable. Git-trackable. Editable.** No vector databases, no cloud dependencies.

## Storage Layout

```
~/.axon/                    # Global memories (identity, preferences)
  index.json                # Metadata index
  search.json               # BM25 inverted index
  memories/
    ax_abc123.md

your-project/
  .axon/                    # Project memories (conventions, decisions)
    index.json
    search.json
    memories/
      ax_def456.md
  .claude/
    CLAUDE.md               # Contains the axon briefing (auto-loaded)
```

## Memory Categories

| Category | What it captures | Example |
|----------|-----------------|---------|
| `identity` | User preferences, stored globally | "User prefers TypeScript and pnpm" |
| `convention` | Project patterns, coding style | "No semicolons in TypeScript code" |
| `decision` | Architectural choices with reasoning | "Using SQLite because simplicity > scale" |
| `lesson` | Corrections, mistakes to avoid | "Never add type annotations to unchanged code" |

## Claude Code Integration

`axon setup` installs:

1. **Skill** (`~/.claude/skills/axon/SKILL.md`) - Teaches Claude to suggest remembering corrections and preferences
2. **Sync hook** (`~/.claude/hooks/axon-sync.sh`) - When Claude edits CLAUDE.md, the hook syncs new entries into the `.axon/` archive
3. **Global memory** (`~/.axon/`) - Initialized for cross-project memories

The skill instructs Claude to:
- Show `Should I remember this?` when it detects corrections or preferences
- Use `axon recall` for deeper context when the briefing isn't enough
- Consolidate memories into CLAUDE.md when the session ends

## BM25 Search

Axon uses BM25 (the algorithm behind Elasticsearch) for retrieval. No keyword matching - actual relevance scoring with term frequency, inverse document frequency, and document length normalization.

```bash
axon recall "authentication tokens"
# Finds memories about "JWT auth with refresh token rotation"
# even though those exact words weren't in the query
```

## Comparison

| Feature | Claude MEMORY.md | mem0 | Zep | **Axon** |
|---------|-----------------|------|-----|----------|
| Human-readable storage | Single file | No (vector DB) | No (DB) | Markdown files |
| Git-trackable | Yes | No | No | Yes |
| No cloud dependency | Yes | No | No | Yes |
| BM25 search | No (full load) | Embedding | Embedding | Yes |
| Two-tier (briefing + archive) | No | No | No | Yes |
| Auto-load on conversation | Yes (always) | N/A | N/A | Yes (curated) |
| Memory categories | No | No | No | Yes |
| Interactive brain dump | No | No | No | Yes |
| Project + global scopes | Project only | No | No | Yes |

## Tech Stack

- TypeScript, ESM
- [commander](https://github.com/tj/commander.js) - CLI framework
- [React Ink](https://github.com/vadimdemedes/ink) - Interactive terminal UI
- [gray-matter](https://github.com/jonschlinkert/gray-matter) - YAML frontmatter
- [nanoid](https://github.com/ai/nanoid) - ID generation
- [vitest](https://vitest.dev) - Testing
- [tsup](https://tsup.egoist.dev) - Bundling
- [biome](https://biomejs.dev) - Linting + formatting

## License

MIT
