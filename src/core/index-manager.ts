import * as fs from "node:fs";
import * as path from "node:path";
import { lockSync, unlockSync } from "proper-lockfile";
import type { IndexEntry, MemoryIndex } from "./types.js";

export class IndexManager {
	private indexPath: string;
	private axonDir: string;

	constructor(axonDir: string) {
		this.axonDir = axonDir;
		this.indexPath = path.join(axonDir, "index.json");
	}

	load(): MemoryIndex {
		if (!fs.existsSync(this.indexPath)) {
			return { version: 1, lastUpdated: new Date().toISOString(), memories: [] };
		}
		try {
			const raw = fs.readFileSync(this.indexPath, "utf-8");
			const parsed = JSON.parse(raw);
			if (!Array.isArray(parsed.memories)) {
				return { version: 1, lastUpdated: new Date().toISOString(), memories: [] };
			}
			return parsed;
		} catch {
			return { version: 1, lastUpdated: new Date().toISOString(), memories: [] };
		}
	}

	private save(index: MemoryIndex): void {
		if (!fs.existsSync(this.axonDir)) {
			fs.mkdirSync(this.axonDir, { recursive: true });
		}
		index.lastUpdated = new Date().toISOString();
		fs.writeFileSync(this.indexPath, JSON.stringify(index, null, 2), "utf-8");
	}

	private withLock<T>(fn: () => T): T {
		if (!fs.existsSync(this.axonDir)) {
			fs.mkdirSync(this.axonDir, { recursive: true });
		}
		let hasLock = false;
		try {
			lockSync(this.axonDir);
			hasLock = true;
			return fn();
		} finally {
			if (hasLock) {
				unlockSync(this.axonDir);
			}
		}
	}

	add(entry: IndexEntry): void {
		this.withLock(() => {
			const index = this.load();
			index.memories.push(entry);
			this.save(index);
		});
	}

	remove(id: string): void {
		this.withLock(() => {
			const index = this.load();
			index.memories = index.memories.filter((m) => m.id !== id);
			this.save(index);
		});
	}

	update(id: string, updates: Partial<IndexEntry>): void {
		this.withLock(() => {
			const index = this.load();
			const idx = index.memories.findIndex((m) => m.id === id);
			if (idx !== -1) {
				index.memories[idx] = { ...index.memories[idx], ...updates };
			}
			this.save(index);
		});
	}

	findById(id: string): IndexEntry | undefined {
		const index = this.load();
		return index.memories.find((m) => m.id === id);
	}

	getAll(): IndexEntry[] {
		return this.load().memories;
	}

	rebuild(entries: IndexEntry[]): void {
		this.withLock(() => {
			const index: MemoryIndex = {
				version: 1,
				lastUpdated: new Date().toISOString(),
				memories: entries,
			};
			this.save(index);
		});
	}
}
