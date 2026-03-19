import type { Command } from "commander";
import { IndexManager } from "../../core/index-manager.js";
import { getAxonDir, resolveScope } from "../../core/scope-resolver.js";
import { listMemoryFiles, readMemory } from "../../core/storage.js";
import type { IndexEntry } from "../../core/types.js";

export function registerReindex(program: Command) {
	program
		.command("reindex")
		.description("Rebuild index.json from markdown files")
		.option("-g, --global", "Reindex global layer", false)
		.action((opts) => {
			const scope = resolveScope({ global: opts.global });
			const axonDir = getAxonDir(scope);
			const im = new IndexManager(axonDir);

			const files = listMemoryFiles(axonDir);
			const entries: IndexEntry[] = [];

			for (const file of files) {
				try {
					const memory = readMemory(axonDir, file);
					entries.push({
						id: memory.id,
						type: memory.type,
						tags: memory.tags,
						created: memory.created,
						updated: memory.updated,
						accessed: memory.accessed,
						accessCount: memory.accessCount,
						importance: memory.importance,
						summary: memory.summary,
						file,
					});
				} catch {
					console.warn(`Skipping invalid file: ${file}`);
				}
			}

			im.rebuild(entries);
			console.log(`Reindexed: ${entries.length} memories`);
		});
}
