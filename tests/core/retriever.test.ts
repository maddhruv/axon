import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { IndexManager } from "../../src/core/index-manager.js";
import { Retriever } from "../../src/core/retriever.js";
import { Writer } from "../../src/core/writer.js";

describe("Retriever", () => {
	let axonDir: string;
	let retriever: Retriever;
	let writer: Writer;

	beforeEach(() => {
		axonDir = fs.mkdtempSync(path.join(os.tmpdir(), "axon-retriever-"));
		fs.mkdirSync(path.join(axonDir, "memories"), { recursive: true });
		const indexManager = new IndexManager(axonDir);
		writer = new Writer(axonDir, indexManager);
		retriever = new Retriever(axonDir, indexManager);
	});

	afterEach(() => {
		fs.rmSync(axonDir, { recursive: true, force: true });
	});

	it("recalls memories by keyword search", () => {
		writer.remember({ text: "Auth uses JWT tokens", tags: ["auth"] });
		writer.remember({ text: "Database uses PostgreSQL", tags: ["db"] });

		const results = retriever.recall({ query: "auth" });
		expect(results.length).toBeGreaterThanOrEqual(1);
		expect(results[0].entry.summary).toContain("Auth");
	});

	it("filters by tags", () => {
		writer.remember({ text: "Auth JWT", tags: ["auth", "jwt"] });
		writer.remember({ text: "DB config", tags: ["db"] });

		const results = retriever.recall({ tags: ["auth"] });
		expect(results).toHaveLength(1);
		expect(results[0].entry.tags).toContain("auth");
	});

	it("respects limit", () => {
		for (let i = 0; i < 10; i++) {
			writer.remember({ text: `Memory ${i}` });
		}
		const results = retriever.recall({ limit: 3 });
		expect(results).toHaveLength(3);
	});

	it("returns full content when requested", () => {
		writer.remember({ text: "Detailed auth explanation with lots of info" });

		const results = retriever.recall({ query: "auth", full: true });
		expect(results[0].content).toBeDefined();
		expect(results[0].content).toContain("Detailed auth explanation");
	});

	it("returns recent memories when using recent option", () => {
		writer.remember({ text: "Memory A" });
		writer.remember({ text: "Memory B" });
		writer.remember({ text: "Memory C" });

		const results = retriever.recall({ recent: 2 });
		expect(results).toHaveLength(2);
	});

	it("increments access count in the index on recall", () => {
		const id = writer.remember({ text: "Test memory", tags: ["test"] });
		retriever.recall({ query: "test" });
		retriever.recall({ query: "test" });

		const indexManager = new IndexManager(axonDir);
		const entry = indexManager.findById(id);
		expect(entry?.accessCount).toBeGreaterThanOrEqual(2);
	});
});
