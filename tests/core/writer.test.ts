import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { IndexManager } from "../../src/core/index-manager.js";
import { Writer } from "../../src/core/writer.js";

describe("Writer", () => {
	let axonDir: string;
	let writer: Writer;
	let indexManager: IndexManager;

	beforeEach(() => {
		axonDir = fs.mkdtempSync(path.join(os.tmpdir(), "axon-writer-"));
		fs.mkdirSync(path.join(axonDir, "memories"), { recursive: true });
		indexManager = new IndexManager(axonDir);
		writer = new Writer(axonDir, indexManager);
	});

	afterEach(() => {
		fs.rmSync(axonDir, { recursive: true, force: true });
	});

	describe("remember", () => {
		it("creates a memory file and updates the index", () => {
			const id = writer.remember({
				text: "Auth uses JWT with refresh tokens",
				tags: ["auth", "jwt"],
			});

			expect(id).toMatch(/^ax_/);

			const index = indexManager.load();
			expect(index.memories).toHaveLength(1);
			expect(index.memories[0].summary).toBe("Auth uses JWT with refresh tokens");
			expect(index.memories[0].category).toBe("convention");

			const filePath = path.join(axonDir, index.memories[0].file);
			expect(fs.existsSync(filePath)).toBe(true);
		});

		it("stores with custom category", () => {
			writer.remember({ text: "Never add docstrings", category: "lesson" });
			const index = indexManager.load();
			expect(index.memories[0].category).toBe("lesson");
		});
	});

	describe("forget", () => {
		it("removes memory file and index entry", () => {
			const id = writer.remember({ text: "To delete" });
			writer.forget(id);

			const index = indexManager.load();
			expect(index.memories).toHaveLength(0);
		});

		it("throws on non-existent id", () => {
			expect(() => writer.forget("ax_nonexist")).toThrow("Memory not found");
		});
	});
});
