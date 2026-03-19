import type { RecallResult } from "../core/retriever.js";

export function formatAiFirst(results: RecallResult[]): string {
	if (results.length === 0) return "No memories found.";

	return results.map((r) => r.content || r.entry.summary).join("\n\n");
}
