import * as fs from "node:fs";
import * as path from "node:path";
import type { Command } from "commander";
import { getAxonDir, getGlobalAxonDir, hasProjectAxon } from "../../core/scope-resolver.js";

export function registerBriefing(program: Command) {
	program
		.command("briefing")
		.description("Show the current memory briefing")
		.option("-g, --global", "Show global briefing only", false)
		.action((opts) => {
			const briefings: { name: string; content: string }[] = [];

			if (!opts.global && hasProjectAxon()) {
				const projectBriefing = path.join(getAxonDir("project"), "briefing.md");
				if (fs.existsSync(projectBriefing)) {
					briefings.push({
						name: "project",
						content: fs.readFileSync(projectBriefing, "utf-8"),
					});
				}
			}

			const globalBriefing = path.join(getGlobalAxonDir(), "briefing.md");
			if (fs.existsSync(globalBriefing)) {
				briefings.push({
					name: "global",
					content: fs.readFileSync(globalBriefing, "utf-8"),
				});
			}

			if (briefings.length === 0) {
				console.log(
					"No briefing generated yet. Use the axon skill in Claude Code to generate one.",
				);
				return;
			}

			for (const b of briefings) {
				console.log(`--- ${b.name} briefing ---`);
				console.log(b.content);
				console.log();
			}
		});
}
