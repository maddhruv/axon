export type MemoryScope = "project" | "global";

export type MemoryCategory = "identity" | "convention" | "decision" | "lesson";

export const MEMORY_CATEGORIES: MemoryCategory[] = ["identity", "convention", "decision", "lesson"];

export interface MemoryMeta {
	id: string;
	tags: string[];
	category: MemoryCategory;
	created: string;
	updated: string;
	accessed: string;
	accessCount: number;
	summary: string;
}

export interface MemoryEntry extends MemoryMeta {
	content: string;
}

export interface IndexEntry extends MemoryMeta {
	file: string;
}

export interface MemoryIndex {
	version: number;
	lastUpdated: string;
	memories: IndexEntry[];
}

export interface RecallOptions {
	query?: string;
	tags?: string[];
	limit?: number;
	full?: boolean;
	scope?: "project" | "global" | "all";
	recent?: number;
}

export interface RememberOptions {
	text: string;
	tags?: string[];
	category?: MemoryCategory;
	scope?: MemoryScope;
}

export interface ScoredMemory {
	entry: IndexEntry;
	score: number;
}
