import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("CLI integration", () => {
	let tmpDir: string;
	const cliPath = path.resolve("dist/index.js");

	const axon = (cmd: string) =>
		execSync(`node ${cliPath} ${cmd}`, {
			cwd: tmpDir,
			encoding: "utf-8",
			env: { ...process.env, HOME: tmpDir },
		}).trim();

	beforeEach(() => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "axon-cli-"));
	});

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	it("init creates .axon directory", () => {
		axon("init");
		expect(fs.existsSync(path.join(tmpDir, ".axon/index.json"))).toBe(true);
		expect(fs.existsSync(path.join(tmpDir, ".axon/memories"))).toBe(true);
	});

	it("remember -> recall -> forget lifecycle", () => {
		axon("init");
		const id = axon('remember "Auth uses JWT" --tags auth,jwt');
		expect(id).toMatch(/^ax_/);

		const recalled = axon("recall auth");
		expect(recalled).toContain("Auth uses JWT");

		axon(`forget ${id}`);
		const afterForget = axon("recall auth");
		expect(afterForget).toBe("No memories found.");
	});

	it("status shows counts", () => {
		axon("init");
		axon('remember "Fact 1" --tags fact');
		axon('remember "Event 1" --tags event');
		const status = axon("status");
		expect(status).toContain("Memories: 2");
	});

	it("reindex rebuilds from files", () => {
		axon("init");
		axon('remember "Test memory" --tags test');
		fs.writeFileSync(path.join(tmpDir, ".axon/index.json"), "{}");
		axon("reindex");
		const status = axon("status");
		expect(status).toContain("Memories: 1");
	});

	it("recall filters by tags", () => {
		axon("init");
		axon('remember "Auth thing" --tags auth');
		axon('remember "DB thing" --tags db');
		const results = axon("recall --tags auth");
		expect(results).toContain("Auth");
		expect(results).not.toContain("DB");
	});

	it("recall by memory ID", () => {
		axon("init");
		const id = axon('remember "Specific memory" --tags test');
		const result = axon(`recall ${id}`);
		expect(result).toContain("Specific memory");
	});

	it("remember with category", () => {
		axon("init");
		const id = axon('remember "Never add docstrings" --tags style --category lesson');
		expect(id).toMatch(/^ax_/);
	});

	it("briefing shows message when no briefing exists", () => {
		axon("init");
		const result = axon("briefing");
		expect(result).toContain("No briefing generated yet");
	});
});
