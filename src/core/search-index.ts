import * as fs from "node:fs";
import * as path from "node:path";

const STOP_WORDS = new Set([
	"a",
	"an",
	"the",
	"is",
	"are",
	"was",
	"were",
	"be",
	"been",
	"being",
	"have",
	"has",
	"had",
	"do",
	"does",
	"did",
	"will",
	"would",
	"could",
	"should",
	"may",
	"might",
	"can",
	"shall",
	"to",
	"of",
	"in",
	"for",
	"on",
	"with",
	"at",
	"by",
	"from",
	"as",
	"into",
	"through",
	"during",
	"before",
	"after",
	"above",
	"below",
	"between",
	"and",
	"but",
	"or",
	"not",
	"no",
	"nor",
	"so",
	"yet",
	"both",
	"either",
	"neither",
	"each",
	"every",
	"all",
	"any",
	"few",
	"more",
	"most",
	"other",
	"some",
	"such",
	"than",
	"too",
	"very",
	"just",
	"about",
	"up",
	"out",
	"if",
	"then",
	"that",
	"this",
	"these",
	"those",
	"it",
	"its",
	"i",
	"me",
	"my",
	"we",
	"our",
	"you",
	"your",
	"he",
	"she",
	"they",
	"them",
	"their",
	"what",
	"which",
	"who",
	"when",
	"where",
	"how",
	"why",
]);

export interface SearchIndex {
	version: number;
	docCount: number;
	avgDocLength: number;
	terms: Record<string, { df: number; postings: Record<string, number> }>;
}

export function tokenize(text: string): string[] {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9\s-_]/g, " ")
		.split(/\s+/)
		.filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

function termFrequency(tokens: string[]): Record<string, number> {
	const freq: Record<string, number> = {};
	for (const token of tokens) {
		freq[token] = (freq[token] || 0) + 1;
	}
	return freq;
}

export class SearchIndexManager {
	private indexPath: string;

	constructor(axonDir: string) {
		this.indexPath = path.join(axonDir, "search.json");
	}

	load(): SearchIndex {
		if (!fs.existsSync(this.indexPath)) {
			return { version: 1, docCount: 0, avgDocLength: 0, terms: {} };
		}
		try {
			const raw = fs.readFileSync(this.indexPath, "utf-8");
			const parsed = JSON.parse(raw);
			if (!parsed.terms) {
				return { version: 1, docCount: 0, avgDocLength: 0, terms: {} };
			}
			return parsed;
		} catch {
			return { version: 1, docCount: 0, avgDocLength: 0, terms: {} };
		}
	}

	save(index: SearchIndex): void {
		const dir = path.dirname(this.indexPath);
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}
		fs.writeFileSync(this.indexPath, JSON.stringify(index), "utf-8");
	}

	addDocument(id: string, text: string): void {
		const index = this.load();
		const tokens = tokenize(text);
		const freq = termFrequency(tokens);

		// Update term postings
		for (const [term, count] of Object.entries(freq)) {
			if (!index.terms[term]) {
				index.terms[term] = { df: 0, postings: {} };
			}
			if (!index.terms[term].postings[id]) {
				index.terms[term].df++;
			}
			index.terms[term].postings[id] = count;
		}

		// Update doc stats
		index.docCount++;
		const totalTokens = Object.values(index.terms).reduce(
			(sum, t) => sum + Object.values(t.postings).reduce((s, c) => s + c, 0),
			0,
		);
		index.avgDocLength = index.docCount > 0 ? totalTokens / index.docCount : 0;

		this.save(index);
	}

	removeDocument(id: string): void {
		const index = this.load();

		for (const [term, data] of Object.entries(index.terms)) {
			if (data.postings[id]) {
				delete data.postings[id];
				data.df--;
				if (data.df <= 0) {
					delete index.terms[term];
				}
			}
		}

		index.docCount = Math.max(0, index.docCount - 1);
		if (index.docCount > 0) {
			const totalTokens = Object.values(index.terms).reduce(
				(sum, t) => sum + Object.values(t.postings).reduce((s, c) => s + c, 0),
				0,
			);
			index.avgDocLength = totalTokens / index.docCount;
		} else {
			index.avgDocLength = 0;
		}

		this.save(index);
	}

	search(query: string, limit = 10): { id: string; score: number }[] {
		const index = this.load();
		if (index.docCount === 0) return [];

		const queryTokens = tokenize(query);
		if (queryTokens.length === 0) return [];

		const k1 = 1.5;
		const b = 0.75;
		const scores: Record<string, number> = {};

		// Collect all doc IDs and their lengths
		const docLengths: Record<string, number> = {};
		for (const data of Object.values(index.terms)) {
			for (const [docId, tf] of Object.entries(data.postings)) {
				docLengths[docId] = (docLengths[docId] || 0) + tf;
			}
		}

		for (const token of queryTokens) {
			const termData = index.terms[token];
			if (!termData) continue;

			const idf = Math.log((index.docCount - termData.df + 0.5) / (termData.df + 0.5) + 1);

			for (const [docId, tf] of Object.entries(termData.postings)) {
				const dl = docLengths[docId] || 0;
				const tfNorm = (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (dl / index.avgDocLength)));
				scores[docId] = (scores[docId] || 0) + idf * tfNorm;
			}
		}

		return Object.entries(scores)
			.map(([id, score]) => ({ id, score }))
			.sort((a, b) => b.score - a.score)
			.slice(0, limit);
	}

	rebuild(documents: { id: string; text: string }[]): void {
		const index: SearchIndex = { version: 1, docCount: 0, avgDocLength: 0, terms: {} };

		let totalTokens = 0;
		for (const doc of documents) {
			const tokens = tokenize(doc.text);
			const freq = termFrequency(tokens);
			totalTokens += tokens.length;

			for (const [term, count] of Object.entries(freq)) {
				if (!index.terms[term]) {
					index.terms[term] = { df: 0, postings: {} };
				}
				index.terms[term].df++;
				index.terms[term].postings[doc.id] = count;
			}

			index.docCount++;
		}

		index.avgDocLength = index.docCount > 0 ? totalTokens / index.docCount : 0;
		this.save(index);
	}
}
