import { describe, expect, it } from "vitest";
import { generateId } from "../../src/core/id.js";

describe("generateId", () => {
	it("generates id with ax_ prefix", () => {
		const id = generateId();
		expect(id).toMatch(/^ax_[a-zA-Z0-9_-]{10}$/);
	});

	it("generates unique ids", () => {
		const ids = new Set(Array.from({ length: 100 }, () => generateId()));
		expect(ids.size).toBe(100);
	});
});
