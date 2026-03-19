<!-- axon:start -->
## Axon Memory Briefing

### Project: Axon
- Memory engine for AI agents, npm CLI (`axon-ai`)
- TypeScript, commander, React Ink, vitest, tsup, biome
- Two storage layers: global (~/.axon/) and project (.axon/)
- Memories stored as markdown with YAML frontmatter, BM25 search index

### Conventions
- No semicolons in TypeScript code
- Always use early returns instead of nested if-else

### Lessons
- Trust TypeScript types - don't add redundant null/falsy checks when the type system already guarantees a value exists

### Recent Decisions
- (none yet)
<!-- axon:end -->
