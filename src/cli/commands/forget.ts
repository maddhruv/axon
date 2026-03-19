import type { Command } from "commander";
import { render } from "ink";
import React from "react";
import { IndexManager } from "../../core/index-manager.js";
import { getAxonDir, getGlobalAxonDir, hasProjectAxon } from "../../core/scope-resolver.js";
import type { IndexEntry } from "../../core/types.js";
import { Writer } from "../../core/writer.js";
import { ForgetSelector } from "../components/ForgetSelector.js";

function getAllLayers(): { dir: string; entries: IndexEntry[] }[] {
	const results: { dir: string; entries: IndexEntry[] }[] = [];
	const layers: string[] = [];
	if (hasProjectAxon()) layers.push(getAxonDir("project"));
	layers.push(getGlobalAxonDir());
	for (const dir of layers) {
		const im = new IndexManager(dir);
		results.push({ dir, entries: im.getAll() });
	}
	return results;
}

function forgetById(id: string): boolean {
	const layers: string[] = [];
	if (hasProjectAxon()) layers.push(getAxonDir("project"));
	layers.push(getGlobalAxonDir());

	for (const dir of layers) {
		const im = new IndexManager(dir);
		const entry = im.findById(id);
		if (entry) {
			const writer = new Writer(dir, im);
			writer.forget(id);
			return true;
		}
	}
	return false;
}

export function registerForget(program: Command) {
	program
		.command("forget")
		.description("Delete a memory by ID")
		.argument("[id]", "Memory ID to delete")
		.action((id: string | undefined) => {
			// ID provided - direct delete
			if (id) {
				if (forgetById(id)) {
					console.log(`Deleted: ${id}`);
				} else {
					console.error(`Memory not found: ${id}`);
					process.exit(1);
				}
				return;
			}

			// No ID and non-TTY - error
			if (!process.stdout.isTTY) {
				console.error("Memory ID required in non-interactive mode");
				process.exit(1);
			}

			// Interactive - show recent memories to pick from
			const allLayers = getAllLayers();
			const allMemories = allLayers.flatMap((l) => l.entries);

			if (allMemories.length === 0) {
				console.log("No memories to forget.");
				return;
			}

			// Sort by recency, take top 15
			allMemories.sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime());
			const recent = allMemories.slice(0, 15);

			const instance = render(
				React.createElement(ForgetSelector, {
					memories: recent,
					onSelect: (selectedId: string) => {
						instance.unmount();
						if (forgetById(selectedId)) {
							console.log(`Deleted: ${selectedId}`);
						}
					},
				}),
			);
		});
}
