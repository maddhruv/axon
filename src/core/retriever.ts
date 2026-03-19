import type { IndexManager } from "./index-manager.js";
import { rankMemories } from "./scorer.js";
import type { SearchIndexManager } from "./search-index.js";
import { readMemory } from "./storage.js";
import type { IndexEntry, RecallOptions } from "./types.js";

export interface RecallResult {
	entry: IndexEntry;
	score: number;
	content?: string;
}

export class Retriever {
	private axonDir: string;
	private indexManager: IndexManager;
	private searchIndex?: SearchIndexManager;

	constructor(axonDir: string, indexManager: IndexManager, searchIndex?: SearchIndexManager) {
		this.axonDir = axonDir;
		this.indexManager = indexManager;
		this.searchIndex = searchIndex;
	}

	recall(options: RecallOptions = {}): RecallResult[] {
		const { query, tags, limit = 5, full = false, recent } = options;

		let entries = this.indexManager.getAll();

		if (tags && tags.length > 0) {
			const tagSet = new Set(tags.map((t) => t.toLowerCase()));
			entries = entries.filter((e) => e.tags.some((t) => tagSet.has(t.toLowerCase())));
		}

		if (recent) {
			entries.sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime());
			entries = entries.slice(0, recent);
		}

		const ranked = rankMemories(entries, query || "", recent || limit, this.searchIndex);

		const now = new Date().toISOString();
		for (const result of ranked) {
			this.indexManager.update(result.entry.id, {
				accessed: now,
				accessCount: result.entry.accessCount + 1,
			});
		}

		return ranked.map((r) => {
			const result: RecallResult = {
				entry: r.entry,
				score: r.score,
			};
			if (full) {
				try {
					const memory = readMemory(this.axonDir, r.entry.file);
					result.content = memory.content;
				} catch {
					// File missing - will be cleaned up on next reindex
				}
			}
			return result;
		});
	}

	recallById(id: string, full = false): RecallResult | undefined {
		const entry = this.indexManager.findById(id);
		if (!entry) return undefined;

		const now = new Date().toISOString();
		this.indexManager.update(id, {
			accessed: now,
			accessCount: entry.accessCount + 1,
		});

		const result: RecallResult = { entry, score: 1 };
		if (full) {
			try {
				const memory = readMemory(this.axonDir, entry.file);
				result.content = memory.content;
			} catch {
				// File missing
			}
		}
		return result;
	}
}
