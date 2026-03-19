import { describe, expect, it } from "vitest";
import { rankMemories } from "../../src/core/scorer.js";
import type { IndexEntry } from "../../src/core/types.js";

const makeEntry = (overrides: Partial<IndexEntry> = {}): IndexEntry => ({
	id: "ax_test1234ab",
	tags: ["auth", "jwt"],
	category: "convention",
	created: "2026-03-18T10:00:00Z",
	updated: "2026-03-18T10:00:00Z",
	accessed: "2026-03-18T10:00:00Z",
	accessCount: 0,
	summary: "Auth uses JWT tokens for authentication",
	file: "memories/ax_test1234ab.md",
	...overrides,
});

describe("scorer", () => {
	describe("rankMemories (keyword fallback)", () => {
		it("ranks matching entries higher", () => {
			const entries = [
				makeEntry({ id: "ax_1", summary: "database config", tags: ["db"] }),
				makeEntry({ id: "ax_2", summary: "auth jwt tokens", tags: ["auth", "jwt"] }),
				makeEntry({ id: "ax_3", summary: "auth middleware", tags: ["auth"] }),
			];
			const ranked = rankMemories(entries, "auth", 2);
			expect(ranked).toHaveLength(2);
			// Both auth entries should be returned, not the db one
			const ids = ranked.map((r) => r.entry.id);
			expect(ids).toContain("ax_2");
			expect(ids).toContain("ax_3");
		});

		it("returns empty for no match", () => {
			const entries = [makeEntry()];
			const ranked = rankMemories(entries, "zzzznonexistent", 5);
			expect(ranked).toHaveLength(0);
		});

		it("returns all when no query (ranked by recency)", () => {
			const entries = [
				makeEntry({ id: "ax_1", updated: "2026-03-17T10:00:00Z" }),
				makeEntry({ id: "ax_2", updated: "2026-03-18T10:00:00Z" }),
			];
			const ranked = rankMemories(entries, "", 5);
			expect(ranked).toHaveLength(2);
			expect(ranked[0].entry.id).toBe("ax_2");
		});
	});
});
