import type { SearchIndexManager } from "./search-index.js";
import type { IndexEntry, ScoredMemory } from "./types.js";

function computeRecency(updatedAt: string): number {
	const ageMs = Date.now() - new Date(updatedAt).getTime();
	const ageDays = ageMs / (1000 * 60 * 60 * 24);
	return Math.exp(-ageDays * (Math.LN2 / 30));
}

function computeAccessBoost(accessCount: number): number {
	return 1 + Math.log(accessCount + 1) / Math.log(100);
}

export function rankMemories(
	entries: IndexEntry[],
	query: string,
	limit: number,
	searchIndex?: SearchIndexManager,
): ScoredMemory[] {
	// No query: rank by recency
	if (!query.trim()) {
		const scored: ScoredMemory[] = entries.map((entry) => ({
			entry,
			score: computeRecency(entry.updated) * computeAccessBoost(entry.accessCount),
		}));
		scored.sort((a, b) => b.score - a.score);
		return scored.slice(0, limit);
	}

	// With query: use BM25 if available, fall back to keyword matching
	if (searchIndex) {
		const bm25Results = searchIndex.search(query, limit * 2);
		if (bm25Results.length === 0) return [];

		const bm25Map = new Map(bm25Results.map((r) => [r.id, r.score]));
		const matched = entries.filter((e) => bm25Map.has(e.id));

		const scored: ScoredMemory[] = matched.map((entry) => {
			const bm25Score = bm25Map.get(entry.id) || 0;
			const recency = computeRecency(entry.updated);
			const access = computeAccessBoost(entry.accessCount);
			return { entry, score: bm25Score * recency * access };
		});

		scored.sort((a, b) => b.score - a.score);
		return scored.slice(0, limit);
	}

	// Fallback: simple keyword matching (for when search.json doesn't exist yet)
	const keywords = query.toLowerCase().split(/\s+/).filter(Boolean);
	const scored: ScoredMemory[] = [];

	for (const entry of entries) {
		const text = `${entry.summary} ${entry.tags.join(" ")}`.toLowerCase();
		let hits = 0;
		for (const kw of keywords) {
			if (text.includes(kw)) hits++;
		}
		if (hits === 0) continue;
		const relevance = hits / keywords.length;
		const recency = computeRecency(entry.updated);
		const access = computeAccessBoost(entry.accessCount);
		scored.push({ entry, score: relevance * recency * access });
	}

	scored.sort((a, b) => b.score - a.score);
	return scored.slice(0, limit);
}
