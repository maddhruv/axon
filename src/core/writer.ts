import { generateId } from "./id.js";
import type { IndexManager } from "./index-manager.js";
import type { SearchIndexManager } from "./search-index.js";
import { deleteMemory, writeMemory } from "./storage.js";
import type { IndexEntry, MemoryEntry, RememberOptions } from "./types.js";

export class Writer {
	private axonDir: string;
	private indexManager: IndexManager;
	private searchIndex?: SearchIndexManager;

	constructor(axonDir: string, indexManager: IndexManager, searchIndex?: SearchIndexManager) {
		this.axonDir = axonDir;
		this.indexManager = indexManager;
		this.searchIndex = searchIndex;
	}

	remember(options: RememberOptions): string {
		const { text, tags = [], category = "convention" } = options;
		const id = generateId();
		const now = new Date().toISOString();

		const summary = text.split("\n")[0].slice(0, 200);

		const memory: MemoryEntry = {
			id,
			tags,
			category,
			created: now,
			updated: now,
			accessed: now,
			accessCount: 0,
			summary,
			content: text,
		};

		const relativePath = writeMemory(this.axonDir, memory);

		const indexEntry: IndexEntry = {
			id,
			tags,
			category,
			created: now,
			updated: now,
			accessed: now,
			accessCount: 0,
			summary,
			file: relativePath,
		};

		this.indexManager.add(indexEntry);
		this.searchIndex?.addDocument(id, `${summary} ${tags.join(" ")} ${text}`);
		return id;
	}

	forget(id: string): void {
		const entry = this.indexManager.findById(id);
		if (!entry) {
			throw new Error(`Memory not found: ${id}`);
		}
		deleteMemory(this.axonDir, entry.file);
		this.indexManager.remove(id);
		this.searchIndex?.removeDocument(id);
	}
}
