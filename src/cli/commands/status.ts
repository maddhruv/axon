import * as fs from "node:fs";
import * as path from "node:path";
import type { Command } from "commander";
import { IndexManager } from "../../core/index-manager.js";
import { getAxonDir, getGlobalAxonDir, hasProjectAxon } from "../../core/scope-resolver.js";
import type { MemoryCategory } from "../../core/types.js";

export function registerStatus(program: Command) {
	program
		.command("status")
		.description("Show memory stats")
		.action(() => {
			const layers: { name: string; dir: string }[] = [];

			if (hasProjectAxon()) {
				layers.push({ name: "project", dir: getAxonDir("project") });
			}
			layers.push({ name: "global", dir: getGlobalAxonDir() });

			for (const layer of layers) {
				const im = new IndexManager(layer.dir);
				const entries = im.getAll();
				const byCategory: Record<string, number> = {};
				for (const e of entries) {
					const cat = e.category || "convention";
					byCategory[cat] = (byCategory[cat] || 0) + 1;
				}

				const briefingPath = path.join(layer.dir, "briefing.md");
				const hasBriefing = fs.existsSync(briefingPath);
				let briefingAge = "";
				if (hasBriefing) {
					const stat = fs.statSync(briefingPath);
					const ageMs = Date.now() - stat.mtimeMs;
					const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
					briefingAge =
						ageHours < 1
							? "just now"
							: ageHours < 24
								? `${ageHours}h ago`
								: `${Math.floor(ageHours / 24)}d ago`;
				}

				console.log(`\n[${layer.name}] ${layer.dir}`);
				console.log(`  Memories: ${entries.length}`);
				if (entries.length > 0) {
					const cats = Object.entries(byCategory)
						.map(([k, v]) => `${k}: ${v}`)
						.join(", ");
					console.log(`  Categories: ${cats}`);
				}
				console.log(`  Briefing: ${hasBriefing ? `yes (${briefingAge})` : "not generated"}`);
			}
			console.log();
		});
}
