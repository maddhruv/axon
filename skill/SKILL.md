# Axon Memory Skill

Persistent AI memory that survives across conversations. Uses the `axon` CLI to store, retrieve, and manage memories. Briefings live in CLAUDE.md files so they load automatically on every conversation.

## Activation

This skill is ALWAYS active. It runs in the background of every conversation.

## How Memory Works

- **CLAUDE.md** - The briefing, auto-loaded every conversation. This is how memories reach you.
- **`.axon/` archive** - Raw memories as markdown files with BM25 search index. Long-term store.

Flow: user says "yes" to remember -> `axon remember` stores to archive -> consolidation regenerates CLAUDE.md from archive -> next conversation loads CLAUDE.md automatically.

## During Conversation - Suggest Capture

When you notice something worth remembering, **ask the user** before storing. Do not store silently.

### When to suggest

| Signal | How to detect | What to say |
|--------|--------------|-------------|
| User corrects your output | "No, don't...", "Wrong, use...", "Never...", "Actually..." | `🧠 Should I remember this? "Never do X, always do Y"` |
| User states a preference | "I prefer...", "Always use...", "I like...", "I want..." | `🧠 Should I remember this preference?` |
| Architectural decision | "Let's use X because Y", "We decided to..." | `🧠 Should I remember this decision?` |
| Convention established | "In this project we...", "The pattern is..." | `🧠 Should I remember this convention?` |
| Bug root cause found | "The bug was caused by..." | `🧠 Should I remember this lesson?` |

### When the user says "yes" (or "remember this", "save this", etc.)

Run the axon command using the Bash tool:

```bash
axon remember "The memory content here" --tags "relevant,tags" --category <identity|convention|decision|lesson>
```

- For personal preferences: add `-g` flag (stores globally, applies to all projects)
- For project-specific things: no flag (stores in project `.axon/`)
- Show: `🧠 Remembered: <brief summary>`

### When NOT to suggest

- Trivial or obvious patterns
- Things already in the CLAUDE.md briefing
- Temporary task details
- More than once per correction (don't nag)

## Recalling Deeper Context

When CLAUDE.md doesn't have enough info for the current task:

1. Run `axon recall "<relevant query>"` to search the archive
2. Show: `🧠 Recalling...` before the search
3. Use the results to inform your response

## On Conversation End - Consolidation

When the user signals they're done (goodbye, thanks, task complete), OR when they ask to consolidate, regenerate the CLAUDE.md briefing from the archive:

The archive (`.axon/`) is the source of truth. CLAUDE.md is a curated summary generated FROM the archive. This keeps CLAUDE.md lean even when the archive has hundreds of memories.

1. Show: `🧠 Consolidating memories...`
2. Run `axon recall --recent 50` to get recent memories
3. Review for duplicates/contradictions - clean up with `axon forget`
4. Read ALL project memories: `axon recall --recent 500`
5. Read ALL global memories: `axon recall --recent 500 -g`
6. Generate updated briefings and write them into CLAUDE.md files:

### Writing the project briefing

Read the current `.claude/CLAUDE.md` file. Find the section between `<!-- axon:start -->` and `<!-- axon:end -->` markers. Replace ONLY that section (preserve everything else in the file). If the markers don't exist, append the section at the end.

Write the axon section as:

```markdown
<!-- axon:start -->
## Axon Memory Briefing

### Project: <project name>
- Tech stack, key tools, build/test commands

### Conventions
- Coding style rules, patterns to follow

### Recent Decisions
- Architectural choices and their reasoning

### Lessons
- Corrections, mistakes to avoid, gotchas
<!-- axon:end -->
```

### Writing the global briefing

Same approach with `~/.claude/CLAUDE.md`. Find/replace between `<!-- axon:start -->` and `<!-- axon:end -->` markers:

```markdown
<!-- axon:start -->
## Axon Memory Briefing

### User
- Name, identity facts
- Coding preferences
- Tool preferences
- Communication style
<!-- axon:end -->
```

### Briefing rules

- **Project CLAUDE.md**: Max 300 lines for the axon section
- **Global CLAUDE.md**: Max 200 lines for the axon section
- Prioritize frequently accessed and recent memories
- Be concise - bullet points, not paragraphs
- NEVER delete content outside the axon markers
- If the CLAUDE.md file doesn't exist, create it with just the axon section

7. Show: `🧠 Memory consolidated. X memories reviewed, briefing updated.`

## Visual Indicator

Every memory operation gets the brain emoji:

- `🧠 Remembered: <summary>`
- `🧠 Recalling...`
- `🧠 Memory loaded`
- `🧠 Consolidating memories...`
- `🧠 Forgot: <id>`

## CLI Reference

```bash
axon remember "<text>" --tags "tag1,tag2" --category <identity|convention|decision|lesson>
axon remember "<text>" -g                  # store globally (for identity/preferences)
axon recall "<query>"                      # BM25 search
axon recall --recent 10                    # recent memories
axon recall --tags "tag1"                  # filter by tag
axon forget <memory-id>                    # delete a memory
axon status                                # counts, categories, briefing freshness
axon briefing                              # show current briefing.md
axon reindex                               # rebuild search index
```

## Important Notes

- Memories are markdown files - human-readable, git-trackable, editable
- Two scopes: project (`.axon/`) and global (`~/.axon/`)
- Archive (`.axon/`) is the source of truth - always store via `axon remember`
- CLAUDE.md briefing is the delivery mechanism - generated from archive during consolidation
- `axon recall` searches the archive for deeper context beyond the briefing
- Quality over quantity - one good memory beats five mediocre ones
- The archive can grow large; CLAUDE.md stays lean (max 300 project + 200 global lines)
