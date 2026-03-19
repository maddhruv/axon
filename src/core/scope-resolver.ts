import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import type { MemoryScope } from "./types.js";

export interface ScopeOptions {
	global?: boolean;
	cwd?: string;
}

export function resolveScope(options: ScopeOptions): MemoryScope {
	if (options.global) return "global";

	const cwd = options.cwd || process.cwd();
	const projectAxon = path.join(cwd, ".axon");

	if (fs.existsSync(projectAxon)) return "project";
	return "global";
}

export function getAxonDir(scope: MemoryScope, cwd?: string): string {
	if (scope === "global") {
		return path.join(os.homedir(), ".axon");
	}
	return path.join(cwd || process.cwd(), ".axon");
}

export function getGlobalAxonDir(): string {
	return path.join(os.homedir(), ".axon");
}

export function getProjectAxonDir(cwd?: string): string {
	return path.join(cwd || process.cwd(), ".axon");
}

export function hasProjectAxon(cwd?: string): boolean {
	return fs.existsSync(path.join(cwd || process.cwd(), ".axon"));
}
