import * as fs from "node:fs";
import * as path from "node:path";
import matter from "gray-matter";
import type { MemoryEntry, MemoryMeta } from "./types.js";

export function writeMemory(axonDir: string, memory: MemoryEntry): string {
	const relativePath = `memories/${memory.id}.md`;
	const fullPath = path.join(axonDir, relativePath);

	const dir = path.dirname(fullPath);
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}

	const meta: MemoryMeta = {
		id: memory.id,
		tags: memory.tags,
		category: memory.category,
		created: memory.created,
		updated: memory.updated,
		accessed: memory.accessed,
		accessCount: memory.accessCount,
		summary: memory.summary,
	};

	const fileContent = matter.stringify(memory.content, meta);
	fs.writeFileSync(fullPath, fileContent, "utf-8");

	return relativePath;
}

export function readMemory(axonDir: string, relativePath: string): MemoryEntry {
	const fullPath = path.join(axonDir, relativePath);
	const raw = fs.readFileSync(fullPath, "utf-8");
	const { data, content } = matter(raw);

	return {
		id: data.id,
		tags: data.tags || [],
		category: data.category || "convention",
		created: data.created,
		updated: data.updated,
		accessed: data.accessed,
		accessCount: data.accessCount || 0,
		summary: data.summary || "",
		content: content.trim(),
	};
}

export function deleteMemory(axonDir: string, relativePath: string): void {
	const fullPath = path.join(axonDir, relativePath);
	if (fs.existsSync(fullPath)) {
		fs.unlinkSync(fullPath);
	}
}

export function listMemoryFiles(axonDir: string): string[] {
	const memoriesDir = path.join(axonDir, "memories");
	if (!fs.existsSync(memoriesDir)) return [];

	const files: string[] = [];
	for (const file of fs.readdirSync(memoriesDir)) {
		if (file.endsWith(".md")) {
			files.push(`memories/${file}`);
		}
	}
	return files;
}
