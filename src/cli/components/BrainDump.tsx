import * as fs from "node:fs";
import * as path from "node:path";
import { Box, Text, useApp, useInput, useStdin } from "ink";
import { useEffect, useState } from "react";
import { extractHashtags } from "../../core/hashtags.js";
import { IndexManager } from "../../core/index-manager.js";
import type { RecallResult } from "../../core/retriever.js";
import { Retriever } from "../../core/retriever.js";
import { getAxonDir, getGlobalAxonDir, hasProjectAxon } from "../../core/scope-resolver.js";
import { SearchIndexManager } from "../../core/search-index.js";
import { Writer } from "../../core/writer.js";
import { formatAiFirst } from "../formatters.js";

function getLayers(): string[] {
	const layers: string[] = [];
	if (hasProjectAxon()) layers.push(getAxonDir("project"));
	layers.push(getGlobalAxonDir());
	return layers;
}

function ensureAxonDir(axonDir: string) {
	if (!fs.existsSync(axonDir)) {
		fs.mkdirSync(`${axonDir}/memories`, { recursive: true });
	}
}

function getWriteScope(): string {
	if (hasProjectAxon()) return getAxonDir("project");
	return getAxonDir("global");
}

function saveMemory(text: string): { id: string; tags: string[] } | null {
	if (!text.trim()) return null;

	const { content, tags } = extractHashtags(text);
	if (!content.trim()) return null;

	const axonDir = getWriteScope();
	ensureAxonDir(axonDir);

	const im = new IndexManager(axonDir);
	const si = new SearchIndexManager(axonDir);
	const writer = new Writer(axonDir, im, si);
	const id = writer.remember({ text: content, tags });

	return { id, tags };
}

interface CommandOutput {
	text: string;
	recallResults?: RecallResult[];
}

function executeCommand(input: string): CommandOutput {
	const parts = input.trim().split(/\s+/);
	const cmd = parts[0].toLowerCase();
	const arg = parts.slice(1).join(" ");

	if (cmd === "/help") {
		return {
			text: [
				"/recall <query>  - search memories",
				"/recall           - list recent memories",
				"/forget <id>     - delete a memory",
				"/forget           - list memories to find an ID",
				"/briefing         - show memory briefing",
				"/status           - show memory counts",
				"/help             - show this help",
			].join("\n"),
		};
	}

	if (cmd === "/status") {
		const lines: string[] = [];
		const layers: { name: string; dir: string }[] = [];
		if (hasProjectAxon()) layers.push({ name: "project", dir: getAxonDir("project") });
		layers.push({ name: "global", dir: getGlobalAxonDir() });
		for (const layer of layers) {
			const im = new IndexManager(layer.dir);
			const count = im.getAll().length;
			lines.push(`[${layer.name}] ${layer.dir} - ${count} memories`);
		}
		return { text: lines.join("\n") };
	}

	if (cmd === "/briefing") {
		const briefings: string[] = [];
		if (hasProjectAxon()) {
			const p = path.join(getAxonDir("project"), "briefing.md");
			if (fs.existsSync(p)) briefings.push(fs.readFileSync(p, "utf-8"));
		}
		const g = path.join(getGlobalAxonDir(), "briefing.md");
		if (fs.existsSync(g)) briefings.push(fs.readFileSync(g, "utf-8"));
		if (briefings.length === 0) return { text: "No briefing generated yet." };
		return { text: briefings.join("\n---\n") };
	}

	if (cmd === "/recall") {
		const layers = getLayers();
		const allResults: RecallResult[] = [];
		for (const dir of layers) {
			const im = new IndexManager(dir);
			const si = new SearchIndexManager(dir);
			const retriever = new Retriever(dir, im, si);
			if (arg) {
				allResults.push(...retriever.recall({ query: arg, limit: 5 }));
			} else {
				allResults.push(...retriever.recall({ recent: 5 }));
			}
		}
		allResults.sort((a, b) => b.score - a.score);
		allResults.splice(5);
		if (allResults.length === 0) return { text: "No memories found." };
		return { text: "", recallResults: allResults };
	}

	if (cmd === "/forget") {
		if (!arg) {
			const layers = getLayers();
			const allEntries = [];
			for (const dir of layers) {
				const im = new IndexManager(dir);
				allEntries.push(...im.getAll());
			}
			allEntries.sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime());
			const recent = allEntries.slice(0, 10);
			if (recent.length === 0) return { text: "No memories to forget." };
			return { text: recent.map((m) => `${m.id} - ${m.summary.slice(0, 60)}`).join("\n") };
		}

		const layers = getLayers();
		for (const dir of layers) {
			const im = new IndexManager(dir);
			const si = new SearchIndexManager(dir);
			const entry = im.findById(arg);
			if (entry) {
				const writer = new Writer(dir, im, si);
				writer.forget(arg);
				return { text: `Deleted: ${arg}` };
			}
		}
		return { text: `Memory not found: ${arg}` };
	}

	return { text: `Unknown command: ${cmd}. Type /help for available commands.` };
}

const COMMANDS = [
	{ name: "/recall", description: "search memories", usage: "/recall <query>" },
	{ name: "/briefing", description: "show memory briefing", usage: "/briefing" },
	{ name: "/forget", description: "delete a memory", usage: "/forget <id>" },
	{ name: "/status", description: "show memory counts", usage: "/status" },
	{ name: "/help", description: "show available commands", usage: "/help" },
];

function getMatchingCommands(input: string): typeof COMMANDS {
	if (input === "/") return COMMANDS;
	const lower = input.toLowerCase().split(" ")[0];
	return COMMANDS.filter((c) => c.name.startsWith(lower));
}

interface OutputLine {
	type: "text" | "saved" | "deleted" | "command" | "recall";
	text: string;
	accessCount?: number;
}

function getAccessLevel(count: number): "bright" | "normal" | "dim" {
	if (count >= 3) return "bright";
	if (count >= 1) return "normal";
	return "dim";
}

export function BrainDump() {
	const { exit } = useApp();
	const { setRawMode } = useStdin();
	const [lines, setLines] = useState<string[]>([""]);
	const [output, setOutput] = useState<OutputLine[]>([]);
	const [history, setHistory] = useState<string[]>([]);
	const [historyIdx, setHistoryIdx] = useState(-1);

	useEffect(() => {
		setRawMode(true);
		return () => setRawMode(false);
	}, [setRawMode]);

	const isSlashMode = lines[0]?.startsWith("/") && lines.length === 1;
	const suggestions = isSlashMode ? getMatchingCommands(lines[0]) : [];
	const isSingleLine = lines.length === 1;

	const pushHistory = (entry: string) => {
		setHistory((prev) => [...prev, entry]);
		setHistoryIdx(-1);
	};

	const addOutput = (newLines: OutputLine[]) => {
		setOutput((prev) => [...prev, ...newLines, { type: "text", text: "" }]);
	};

	useInput((input, key) => {
		// Ctrl+C or Esc - exit
		if ((key.ctrl && input === "c") || key.escape) {
			exit();
			return;
		}

		// Up/Down arrows - history navigation (only on single empty/slash line)
		if (key.upArrow && isSingleLine) {
			const newIdx = historyIdx === -1 ? history.length - 1 : Math.max(0, historyIdx - 1);
			if (history.length > 0 && newIdx >= 0) {
				setHistoryIdx(newIdx);
				setLines([history[newIdx]]);
			}
			return;
		}
		if (key.downArrow && isSingleLine && historyIdx !== -1) {
			const newIdx = historyIdx + 1;
			if (newIdx >= history.length) {
				setHistoryIdx(-1);
				setLines([""]);
			} else {
				setHistoryIdx(newIdx);
				setLines([history[newIdx]]);
			}
			return;
		}

		// Tab - autocomplete first matching command
		if (key.tab && isSlashMode && suggestions.length > 0) {
			const match = suggestions[0];
			setLines([match.name + " "]);
			return;
		}

		// Enter
		if (key.return) {
			const firstLine = lines[0] || "";

			// Slash command: single Enter executes (but not just "/" alone)
			if (firstLine.startsWith("/") && firstLine.trim().length > 1) {
				const cmd = lines.join(" ").trim();
				pushHistory(cmd);
				const result = executeCommand(cmd);
				const newOutput: OutputLine[] = [{ type: "command", text: `> ${cmd}` }];

				if (result.recallResults) {
					for (const r of result.recallResults) {
						newOutput.push({
							type: "recall",
							text: r.content || r.entry.summary,
							accessCount: r.entry.accessCount,
						});
					}
				} else if (result.text) {
					for (const line of result.text.split("\n")) {
						newOutput.push({ type: "text", text: line });
					}
				}

				addOutput(newOutput);
				setLines([""]);
				return;
			}

			// Just "/" alone - ignore
			if (firstLine.trim() === "/") {
				return;
			}

			// Normal text: double Enter saves, single Enter adds newline
			setLines((prev) => {
				if (prev.length > 1 && prev[prev.length - 1] === "") {
					const text = prev.slice(0, -1).join("\n").trim();
					if (text) {
						pushHistory(text);
						const result = saveMemory(text);
						if (result) {
							const tagStr = result.tags.length > 0 ? ` (tags: ${result.tags.join(", ")})` : "";
							addOutput([{ type: "saved", text: `Saved: ${result.id}${tagStr}` }]);
						}
					}
					return [""];
				}
				return [...prev, ""];
			});
			return;
		}

		// Backspace
		if (key.backspace || key.delete) {
			setLines((prev) => {
				const next = [...prev];
				const lastIdx = next.length - 1;
				if (next[lastIdx].length > 0) {
					next[lastIdx] = next[lastIdx].slice(0, -1);
				} else if (next.length > 1) {
					next.pop();
				}
				return next;
			});
			setHistoryIdx(-1);
			return;
		}

		// Regular character input
		if (!key.ctrl && !key.meta && input) {
			setLines((prev) => {
				const next = [...prev];
				next[next.length - 1] += input;
				return next;
			});
			setHistoryIdx(-1);
		}
	});

	return (
		<Box flexDirection="column" gap={1}>
			<Box flexDirection="column">
				<Text bold color="cyan">
					axon - brain dump mode
				</Text>
				<Text dimColor>
					Type your thoughts. Double-Enter to save. /help for commands. Ctrl+C to quit.
				</Text>
			</Box>

			{output.length > 0 && (
				<Box flexDirection="column">
					{output.map((line, i) => {
						if (line.type === "saved") {
							return (
								<Box key={`out-${i}`}>
									<Text color="green">{line.text}</Text>
								</Box>
							);
						}
						if (line.type === "deleted" || line.text.startsWith("Deleted:")) {
							return (
								<Box key={`out-${i}`}>
									<Text color="yellow">{line.text}</Text>
								</Box>
							);
						}
						if (line.type === "command") {
							return (
								<Box key={`out-${i}`}>
									<Text color="magenta">{line.text}</Text>
								</Box>
							);
						}
						if (line.type === "recall") {
							const level = getAccessLevel(line.accessCount || 0);
							return (
								<Box key={`out-${i}`}>
									<Text dimColor={level === "dim"} color={level === "bright" ? "white" : undefined}>
										{level === "dim" ? "  " : level === "normal" ? " " : ""}
										{line.text}
									</Text>
								</Box>
							);
						}
						return (
							<Box key={`out-${i}`}>
								<Text dimColor>{line.text}</Text>
							</Box>
						);
					})}
				</Box>
			)}

			<Box flexDirection="column">
				{lines.map((line, i) => (
					<Box key={`line-${i}`}>
						<Text dimColor>{"> "}</Text>
						<Text>{line}</Text>
						{i === lines.length - 1 && <Text color="cyan">|</Text>}
					</Box>
				))}
			</Box>

			{isSlashMode && suggestions.length > 0 && (
				<Box flexDirection="column" marginLeft={2}>
					{suggestions.map((cmd, i) => (
						<Box key={cmd.name} gap={1}>
							<Text color={i === 0 ? "cyan" : "gray"} bold={i === 0}>
								{cmd.name}
							</Text>
							<Text dimColor>{cmd.description}</Text>
							{i === 0 && (
								<Text dimColor italic>
									{" "}
									(tab to complete)
								</Text>
							)}
						</Box>
					))}
				</Box>
			)}
		</Box>
	);
}
