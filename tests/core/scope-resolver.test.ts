import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getAxonDir, resolveScope } from "../../src/core/scope-resolver.js";

describe("scope-resolver", () => {
	let tmpDir: string;

	beforeEach(() => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "axon-test-"));
	});

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	describe("resolveScope", () => {
		it("returns global when --global flag is set", () => {
			const scope = resolveScope({ global: true, cwd: tmpDir });
			expect(scope).toBe("global");
		});

		it("returns project when .axon/ exists in cwd", () => {
			fs.mkdirSync(path.join(tmpDir, ".axon"), { recursive: true });
			const scope = resolveScope({ global: false, cwd: tmpDir });
			expect(scope).toBe("project");
		});

		it("returns global when no .axon/ in cwd", () => {
			const scope = resolveScope({ global: false, cwd: tmpDir });
			expect(scope).toBe("global");
		});
	});

	describe("getAxonDir", () => {
		it("returns ~/.axon for global scope", () => {
			const dir = getAxonDir("global");
			expect(dir).toBe(path.join(os.homedir(), ".axon"));
		});

		it("returns .axon in cwd for project scope", () => {
			const dir = getAxonDir("project", tmpDir);
			expect(dir).toBe(path.join(tmpDir, ".axon"));
		});
	});
});
