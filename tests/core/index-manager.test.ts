import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { IndexManager } from "../../src/core/index-manager.js";
import type { IndexEntry } from "../../src/core/types.js";

describe("IndexManager", () => {
	let axonDir: string;
	let manager: IndexManager;

	const sampleEntry: IndexEntry = {
		id: "ax_test1234ab",
		tags: ["auth", "jwt"],
		category: "convention",
		created: "2026-03-18T10:00:00Z",
		updated: "2026-03-18T10:00:00Z",
		accessed: "2026-03-18T10:00:00Z",
		accessCount: 0,
		summary: "Auth uses JWT tokens",
		file: "memories/ax_test1234ab.md",
	};

	beforeEach(() => {
		axonDir = fs.mkdtempSync(path.join(os.tmpdir(), "axon-index-"));
		manager = new IndexManager(axonDir);
	});

	afterEach(() => {
		fs.rmSync(axonDir, { recursive: true, force: true });
	});

	it("creates a new index if none exists", () => {
		const index = manager.load();
		expect(index.version).toBe(1);
		expect(index.memories).toEqual([]);
	});

	it("adds an entry to the index", () => {
		manager.add(sampleEntry);
		const index = manager.load();
		expect(index.memories).toHaveLength(1);
		expect(index.memories[0].id).toBe("ax_test1234ab");
	});

	it("removes an entry by id", () => {
		manager.add(sampleEntry);
		manager.remove("ax_test1234ab");
		const index = manager.load();
		expect(index.memories).toHaveLength(0);
	});

	it("updates an entry", () => {
		manager.add(sampleEntry);
		manager.update("ax_test1234ab", {
			accessCount: 5,
			accessed: "2026-03-19T10:00:00Z",
		});
		const index = manager.load();
		expect(index.memories[0].accessCount).toBe(5);
	});

	it("finds entry by id", () => {
		manager.add(sampleEntry);
		const found = manager.findById("ax_test1234ab");
		expect(found).toBeDefined();
		expect(found?.summary).toBe("Auth uses JWT tokens");
	});

	it("returns undefined for missing id", () => {
		const found = manager.findById("ax_s_nonexist");
		expect(found).toBeUndefined();
	});
});
