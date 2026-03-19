import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SearchIndexManager, tokenize } from "../../src/core/search-index.js";

describe("tokenize", () => {
	it("lowercases and splits on whitespace", () => {
		expect(tokenize("Auth Uses JWT")).toEqual(["auth", "uses", "jwt"]);
	});

	it("removes stop words", () => {
		expect(tokenize("the user is using auth")).toEqual(["user", "using", "auth"]);
	});

	it("removes punctuation", () => {
		expect(tokenize("auth, jwt. tokens!")).toEqual(["auth", "jwt", "tokens"]);
	});

	it("keeps hyphens and underscores", () => {
		expect(tokenize("my-tag another_tag")).toEqual(["my-tag", "another_tag"]);
	});

	it("filters single-char tokens", () => {
		expect(tokenize("a b cd ef")).toEqual(["cd", "ef"]);
	});
});

describe("SearchIndexManager", () => {
	let axonDir: string;
	let sim: SearchIndexManager;

	beforeEach(() => {
		axonDir = fs.mkdtempSync(path.join(os.tmpdir(), "axon-search-"));
		sim = new SearchIndexManager(axonDir);
	});

	afterEach(() => {
		fs.rmSync(axonDir, { recursive: true, force: true });
	});

	it("starts with empty index", () => {
		const index = sim.load();
		expect(index.docCount).toBe(0);
		expect(index.terms).toEqual({});
	});

	it("adds a document and updates terms", () => {
		sim.addDocument("ax_1", "Auth uses JWT tokens for authentication");
		const index = sim.load();
		expect(index.docCount).toBe(1);
		expect(index.terms.auth).toBeDefined();
		expect(index.terms.jwt).toBeDefined();
		expect(index.terms.auth.postings.ax_1).toBe(1);
	});

	it("removes a document and cleans up terms", () => {
		sim.addDocument("ax_1", "Auth uses JWT tokens");
		sim.removeDocument("ax_1");
		const index = sim.load();
		expect(index.docCount).toBe(0);
		expect(index.terms.auth).toBeUndefined();
	});

	it("searches and returns ranked results", () => {
		sim.addDocument("ax_1", "Auth uses JWT tokens for authentication");
		sim.addDocument("ax_2", "Database uses PostgreSQL with Prisma");
		sim.addDocument("ax_3", "Auth middleware validates JWT on every request");

		const results = sim.search("auth JWT");
		expect(results.length).toBeGreaterThanOrEqual(2);
		// Both auth docs should rank higher than database doc
		const ids = results.map((r) => r.id);
		expect(ids).toContain("ax_1");
		expect(ids).toContain("ax_3");
		expect(ids).not.toContain("ax_2");
	});

	it("returns empty for no-match query", () => {
		sim.addDocument("ax_1", "Auth uses JWT tokens");
		const results = sim.search("database postgresql");
		expect(results).toHaveLength(0);
	});

	it("returns empty for empty query", () => {
		sim.addDocument("ax_1", "Auth uses JWT tokens");
		const results = sim.search("");
		expect(results).toHaveLength(0);
	});

	it("rebuilds index from documents", () => {
		sim.addDocument("ax_1", "old data");
		sim.rebuild([
			{ id: "ax_2", text: "Auth JWT tokens" },
			{ id: "ax_3", text: "Database PostgreSQL" },
		]);
		const index = sim.load();
		expect(index.docCount).toBe(2);
		expect(index.terms.old).toBeUndefined();
		expect(index.terms.auth).toBeDefined();
	});

	it("handles corrupted search.json gracefully", () => {
		fs.writeFileSync(path.join(axonDir, "search.json"), "invalid json");
		const index = sim.load();
		expect(index.docCount).toBe(0);
	});
});
