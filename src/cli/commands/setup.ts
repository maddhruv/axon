import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { Command } from "commander";

const HOOK_SCRIPT = `#!/bin/bash
# Axon memory sync hook
# Fires after Edit/Write on CLAUDE.md files
# Parses the axon section and syncs new entries into the .axon/ archive

set -e

INPUT=$(cat)

FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [[ "$FILE_PATH" != *"CLAUDE.md"* ]]; then
  exit 0
fi

if ! command -v axon &> /dev/null; then
  exit 0
fi

AXON_SECTION=$(sed -n '/<!-- axon:start -->/,/<!-- axon:end -->/p' "$FILE_PATH" 2>/dev/null | grep -v '<!-- axon' | grep -v '^##' | grep -v '^$')

if [[ -z "$AXON_SECTION" ]]; then
  exit 0
fi

SCOPE_FLAG=""
if [[ "$FILE_PATH" == *"$HOME/.claude/CLAUDE.md"* ]]; then
  SCOPE_FLAG="-g"
fi

EXISTING=$(axon recall --recent 100 $SCOPE_FLAG 2>/dev/null || echo "")

while IFS= read -r line; do
  MEMORY=$(echo "$line" | sed 's/^[[:space:]]*-[[:space:]]*//' | sed 's/^[[:space:]]*//')

  if [[ -z "$MEMORY" ]] || [[ "$MEMORY" == "("*")" ]] || [[ "$MEMORY" == "###"* ]]; then
    continue
  fi

  if echo "$EXISTING" | grep -qF "$MEMORY"; then
    continue
  fi

  CATEGORY="convention"
  SECTION_CONTEXT=$(sed -n '/<!-- axon:start -->/,/<!-- axon:end -->/p' "$FILE_PATH" 2>/dev/null | sed -n "1,/$(echo "$MEMORY" | head -c 40 | sed 's/[\\/&]/\\\\&/g')/p" | grep '###' | tail -1)

  if echo "$SECTION_CONTEXT" | grep -qi "user"; then
    CATEGORY="identity"
  elif echo "$SECTION_CONTEXT" | grep -qi "lesson"; then
    CATEGORY="lesson"
  elif echo "$SECTION_CONTEXT" | grep -qi "decision"; then
    CATEGORY="decision"
  fi

  TAGS=$(echo "$MEMORY" | tr '[:upper:]' '[:lower:]' | tr -cs 'a-z0-9' ' ' | tr ' ' '\\n' | grep -v -E '^(the|is|are|was|a|an|in|on|for|to|of|and|or|but|not|use|always|never|dont|with)$' | head -3 | tr '\\n' ',' | sed 's/,$//')

  axon remember "$MEMORY" --tags "$TAGS" --category "$CATEGORY" $SCOPE_FLAG 2>/dev/null || true

done <<< "$AXON_SECTION"

exit 0
`;

function installHook(): boolean {
	const hooksDir = path.join(os.homedir(), ".claude", "hooks");
	const hookPath = path.join(hooksDir, "axon-sync.sh");

	fs.mkdirSync(hooksDir, { recursive: true });
	fs.writeFileSync(hookPath, HOOK_SCRIPT, { mode: 0o755 });

	return true;
}

function installHookConfig(): boolean {
	const settingsPath = path.join(os.homedir(), ".claude", "settings.json");

	let settings: Record<string, unknown> = {};
	if (fs.existsSync(settingsPath)) {
		try {
			settings = JSON.parse(fs.readFileSync(settingsPath, "utf-8"));
		} catch {
			settings = {};
		}
	}

	const hooks = (settings.hooks || {}) as Record<string, unknown[]>;
	const postToolUse = (hooks.PostToolUse || []) as Array<{ matcher: string; hooks: unknown[] }>;

	const alreadyInstalled = postToolUse.some((entry) =>
		entry.hooks?.some(
			(h: unknown) =>
				typeof h === "object" &&
				h !== null &&
				"command" in h &&
				(h as { command: string }).command.includes("axon-sync"),
		),
	);

	if (alreadyInstalled) return false;

	postToolUse.push({
		matcher: "Edit|Write",
		hooks: [
			{
				type: "command",
				command: path.join(os.homedir(), ".claude", "hooks", "axon-sync.sh"),
				timeout: 10,
			},
		],
	});

	hooks.PostToolUse = postToolUse;
	settings.hooks = hooks;

	fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
	return true;
}

function installSkill(): boolean {
	const skillDir = path.join(os.homedir(), ".claude", "skills", "axon");
	const skillPath = path.join(skillDir, "SKILL.md");

	// Find the axon package's skill file relative to this script
	const thisFile = new URL(import.meta.url).pathname;
	const candidates = [
		path.resolve(path.dirname(thisFile), "..", "..", "skill", "SKILL.md"),
		path.resolve(path.dirname(thisFile), "..", "skill", "SKILL.md"),
		path.resolve(process.cwd(), "skill", "SKILL.md"),
	];

	let sourcePath: string | null = null;
	for (const candidate of candidates) {
		if (fs.existsSync(candidate)) {
			sourcePath = candidate;
			break;
		}
	}

	if (!sourcePath) {
		console.log("  Skill file not found - skipping skill install");
		return false;
	}

	fs.mkdirSync(skillDir, { recursive: true });

	// Symlink if possible, copy as fallback
	try {
		if (fs.existsSync(skillPath)) fs.unlinkSync(skillPath);
		fs.symlinkSync(sourcePath, skillPath);
	} catch {
		fs.copyFileSync(sourcePath, skillPath);
	}

	return true;
}

export function registerSetup(program: Command) {
	program
		.command("setup")
		.description("Install axon hooks and skill into Claude Code")
		.action(() => {
			console.log("Setting up axon for Claude Code...\n");

			// 1. Install hook script
			installHook();
			console.log("  Installed sync hook: ~/.claude/hooks/axon-sync.sh");

			// 2. Configure hook in settings
			const configAdded = installHookConfig();
			if (configAdded) {
				console.log("  Added hook config to: ~/.claude/settings.json");
			} else {
				console.log("  Hook config already exists in: ~/.claude/settings.json");
			}

			// 3. Install skill
			const skillInstalled = installSkill();
			if (skillInstalled) {
				console.log("  Installed skill: ~/.claude/skills/axon/SKILL.md");
			}

			// 4. Init global memory
			const globalDir = path.join(os.homedir(), ".axon");
			if (!fs.existsSync(path.join(globalDir, "index.json"))) {
				fs.mkdirSync(path.join(globalDir, "memories"), { recursive: true });
				fs.writeFileSync(
					path.join(globalDir, "index.json"),
					JSON.stringify(
						{ version: 1, lastUpdated: new Date().toISOString(), memories: [] },
						null,
						2,
					),
				);
				console.log("  Initialized global memory: ~/.axon/");
			}

			console.log("\nDone! Restart Claude Code to activate. The axon skill will:");
			console.log("  - Auto-capture corrections, preferences, and decisions");
			console.log("  - Sync memories from CLAUDE.md into the archive");
			console.log("  - Load your memory briefing on every conversation");
		});
}
