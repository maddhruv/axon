import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { deleteMemory, listMemoryFiles, readMemory, writeMemory } from "../../src/core/storage.js";
import type { MemoryEntry } from "../../src/core/types.js";

describe("storage", () => {
	let axonDir: string;

	beforeEach(() => {
		axonDir = fs.mkdtempSync(path.join(os.tmpdir(), "axon-storage-"));
		fs.mkdirSync(path.join(axonDir, "memories"), { recursive: true });
	});

	afterEach(() => {
		fs.rmSync(axonDir, { recursive: true, force: true });
	});

	const sampleMemory: MemoryEntry = {
		id: "ax_test1234ab",
		tags: ["auth", "jwt"],
		category: "convention",
		created: "2026-03-18T10:00:00Z",
		updated: "2026-03-18T10:00:00Z",
		accessed: "2026-03-18T10:00:00Z",
		accessCount: 0,
		summary: "Auth uses JWT tokens",
		content: "Authentication is handled via JWT.\n- Access tokens: 15min expiry",
	};

	describe("writeMemory", () => {
		it("writes a markdown file with YAML frontmatter", () => {
			writeMemory(axonDir, sampleMemory);
			const filePath = path.join(axonDir, "memories/ax_test1234ab.md");
			expect(fs.existsSync(filePath)).toBe(true);
			const content = fs.readFileSync(filePath, "utf-8");
			expect(content).toContain("id: ax_test1234ab");
			expect(content).toContain("Authentication is handled via JWT.");
		});
	});

	describe("readMemory", () => {
		it("reads a memory file and returns MemoryEntry", () => {
			writeMemory(axonDir, sampleMemory);
			const result = readMemory(axonDir, "memories/ax_test1234ab.md");
			expect(result.id).toBe("ax_test1234ab");
			expect(result.tags).toEqual(["auth", "jwt"]);
			expect(result.content).toContain("Authentication is handled via JWT.");
		});
	});

	describe("deleteMemory", () => {
		it("deletes a memory file", () => {
			writeMemory(axonDir, sampleMemory);
			const filePath = "memories/ax_test1234ab.md";
			deleteMemory(axonDir, filePath);
			expect(fs.existsSync(path.join(axonDir, filePath))).toBe(false);
		});
	});

	describe("listMemoryFiles", () => {
		it("lists all .md files in memories dir", () => {
			writeMemory(axonDir, sampleMemory);
			const files = listMemoryFiles(axonDir);
			expect(files).toHaveLength(1);
			expect(files[0]).toContain("ax_test1234ab.md");
		});
	});
});
