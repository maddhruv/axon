import type { Command } from "commander";
import { render } from "ink";
import React from "react";
import { IndexManager } from "../../core/index-manager.js";
import type { RecallResult } from "../../core/retriever.js";
import { Retriever } from "../../core/retriever.js";
import { getAxonDir, getGlobalAxonDir, hasProjectAxon } from "../../core/scope-resolver.js";
import { SearchIndexManager } from "../../core/search-index.js";
import { TextInput } from "../components/Select.js";
import { formatAiFirst } from "../formatters.js";

function getLayers(globalOnly: boolean): string[] {
	if (globalOnly) return [getGlobalAxonDir()];
	const layers: string[] = [];
	if (hasProjectAxon()) layers.push(getAxonDir("project"));
	layers.push(getGlobalAxonDir());
	return layers;
}

function doRecall(
	query: string | undefined,
	opts: {
		tags?: string;
		limit: string;
		full: boolean;
		recent?: string;
		global: boolean;
	},
): RecallResult[] {
	const results: RecallResult[] = [];

	if (query?.startsWith("ax_")) {
		const layers = getLayers(opts.global);
		for (const dir of layers) {
			const im = new IndexManager(dir);
			const retriever = new Retriever(dir, im);
			const result = retriever.recallById(query, opts.full);
			if (result) {
				results.push(result);
				break;
			}
		}
	} else {
		const layers = getLayers(opts.global);
		const tags = opts.tags ? opts.tags.split(",").map((t: string) => t.trim()) : undefined;

		for (const dir of layers) {
			const im = new IndexManager(dir);
			const searchIndex = new SearchIndexManager(dir);
			const retriever = new Retriever(dir, im, searchIndex);
			const layerResults = retriever.recall({
				query,
				tags,
				limit: Number.parseInt(opts.limit, 10),
				full: opts.full,
				recent: opts.recent ? Number.parseInt(opts.recent, 10) : undefined,
			});
			results.push(...layerResults);
		}

		results.sort((a, b) => b.score - a.score);
		results.splice(Number.parseInt(opts.limit, 10));
	}

	return results;
}

export function registerRecall(program: Command) {
	program
		.command("recall")
		.description("Search and retrieve memories")
		.argument("[query]", "Search keywords or memory ID")
		.option("--tags <tags>", "Filter by tags (comma-separated)")
		.option("-l, --limit <n>", "Max results", "5")
		.option("-f, --full", "Include full memory content", false)
		.option("--recent <n>", "Get N most recent memories")
		.option("-g, --global", "Search global layer only", false)
		.action((query: string | undefined, opts) => {
			const hasFilters = query || opts.tags || opts.recent;
			if (hasFilters || !process.stdout.isTTY) {
				const results = doRecall(query, opts);
				console.log(formatAiFirst(results));
				return;
			}

			const instance = render(
				React.createElement(TextInput, {
					message: "Search memories:",
					placeholder: "enter keywords or leave empty to list all",
					onSubmit: (searchQuery: string) => {
						instance.unmount();
						const results = doRecall(searchQuery || undefined, opts);
						console.log(formatAiFirst(results));
					},
				}),
			);
		});
}
