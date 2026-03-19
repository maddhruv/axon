import * as fs from "node:fs";
import type { Command } from "commander";
import { render } from "ink";
import React from "react";
import { IndexManager } from "../../core/index-manager.js";
import { getAxonDir, hasProjectAxon } from "../../core/scope-resolver.js";
import { SearchIndexManager } from "../../core/search-index.js";
import type { MemoryCategory, MemoryScope } from "../../core/types.js";
import { Writer } from "../../core/writer.js";
import { RememberWizard } from "../components/RememberWizard.js";

function doRemember(text: string, tags: string[], scope: MemoryScope, category?: MemoryCategory) {
	const axonDir = getAxonDir(scope);

	if (!fs.existsSync(axonDir)) {
		fs.mkdirSync(`${axonDir}/memories`, { recursive: true });
	}

	const indexManager = new IndexManager(axonDir);
	const searchIndex = new SearchIndexManager(axonDir);
	const writer = new Writer(axonDir, indexManager, searchIndex);
	return writer.remember({ text, tags, category });
}

export function registerRemember(program: Command) {
	program
		.command("remember")
		.description("Store a new memory")
		.argument("[text]", "Memory content")
		.option("--tags <tags>", "Comma-separated tags")
		.option("--category <cat>", "Memory category (used by skill)")
		.option("-g, --global", "Store in global layer", false)
		.option("-p, --project", "Store in project layer", false)
		.action((text: string | undefined, opts) => {
			const hasText = !!text;
			const hasTags = opts.tags !== undefined;
			const hasScope = opts.global || opts.project;
			const scope: MemoryScope = opts.global ? "global" : hasProjectAxon() ? "project" : "global";
			const category = opts.category as MemoryCategory | undefined;

			// If all provided, execute directly
			if (hasText && hasTags && hasScope) {
				const tags = opts.tags
					? opts.tags
							.split(",")
							.map((t: string) => t.trim())
							.filter(Boolean)
					: [];
				const id = doRemember(text, tags, scope, category);
				console.log(id);
				return;
			}

			// Non-TTY without text - error
			if (!hasText && !process.stdout.isTTY) {
				console.error("Memory content required in non-interactive mode");
				process.exit(1);
			}

			// Non-TTY with text but missing flags - use defaults
			if (!process.stdout.isTTY) {
				const tags = opts.tags
					? opts.tags
							.split(",")
							.map((t: string) => t.trim())
							.filter(Boolean)
					: [];
				const id = doRemember(text!, tags, scope, category);
				console.log(id);
				return;
			}

			// Interactive wizard for missing inputs
			const instance = render(
				React.createElement(RememberWizard, {
					initialText: hasText ? text : undefined,
					initialScope: hasScope ? scope : undefined,
					initialTags: hasTags ? opts.tags : undefined,
					hasProjectAxon: hasProjectAxon(),
					onComplete: (result) => {
						instance.unmount();
						const id = doRemember(result.text, result.tags, result.scope, category);
						console.log(id);
					},
				}),
			);
		});
}
