import * as fs from "node:fs";
import * as path from "node:path";
import type { Command } from "commander";

const AXON_CLAUDE_MD_TEMPLATE = `<!-- axon:start -->
## Axon Memory Briefing

### Project
- (axon will fill this in as it learns about your project)

### Conventions
- (none yet)

### Lessons
- (none yet)

### Recent Decisions
- (none yet)
<!-- axon:end -->
`;

export function registerInit(program: Command) {
	program
		.command("init")
		.description("Initialize axon memory in the current project")
		.action(() => {
			const cwd = process.cwd();
			const axonDir = path.join(cwd, ".axon");
			const claudeDir = path.join(cwd, ".claude");
			const claudeMdPath = path.join(claudeDir, "CLAUDE.md");

			// Init .axon/ directory
			if (fs.existsSync(path.join(axonDir, "index.json"))) {
				console.log("Already initialized: .axon/");
			} else {
				fs.mkdirSync(path.join(axonDir, "memories"), { recursive: true });
				fs.writeFileSync(
					path.join(axonDir, "index.json"),
					JSON.stringify(
						{ version: 1, lastUpdated: new Date().toISOString(), memories: [] },
						null,
						2,
					),
				);
				console.log("Initialized project memory: .axon/");
			}

			// Ensure .claude/CLAUDE.md has axon markers
			if (fs.existsSync(claudeMdPath)) {
				const content = fs.readFileSync(claudeMdPath, "utf-8");
				if (content.includes("<!-- axon:start -->")) {
					console.log("CLAUDE.md already has axon section");
				} else {
					fs.writeFileSync(claudeMdPath, `${content}\n${AXON_CLAUDE_MD_TEMPLATE}`);
					console.log("Added axon section to .claude/CLAUDE.md");
				}
			} else {
				fs.mkdirSync(claudeDir, { recursive: true });
				fs.writeFileSync(claudeMdPath, AXON_CLAUDE_MD_TEMPLATE);
				console.log("Created .claude/CLAUDE.md with axon section");
			}

			console.log("\nRun 'axon setup' if you haven't set up Claude Code integration yet.");
		});
}
