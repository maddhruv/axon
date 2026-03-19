import { Box, Text } from "ink";
import { useState } from "react";
import type { MemoryScope } from "../../core/types.js";
import { Select, TextInput } from "./Select.js";

type Step = "text" | "scope" | "tags" | "done";

interface Props {
	initialText?: string;
	initialScope?: MemoryScope;
	initialTags?: string;
	hasProjectAxon: boolean;
	onComplete: (result: { text: string; scope: MemoryScope; tags: string[] }) => void;
}

function parseTags(val: string | undefined): string[] {
	if (!val) return [];
	return val
		.split(",")
		.map((t) => t.trim())
		.filter(Boolean);
}

function nextStep(from: Step, needs: { text: boolean; scope: boolean; tags: boolean }): Step {
	const order: Step[] = ["text", "scope", "tags"];
	const fromIdx = order.indexOf(from);
	for (let i = fromIdx + 1; i < order.length; i++) {
		if (needs[order[i] as keyof typeof needs]) return order[i];
	}
	return "done";
}

export function RememberWizard({
	initialText,
	initialScope,
	initialTags,
	hasProjectAxon: hasProject,
	onComplete,
}: Props) {
	const needsText = !initialText;
	const needsScope = !initialScope && hasProject;
	const needsTags = initialTags === undefined;
	const needs = { text: needsText, scope: needsScope, tags: needsTags };

	const firstStep = needsText ? "text" : nextStep("text", needs);
	const [step, setStep] = useState<Step>(firstStep);
	const [text, setText] = useState(initialText || "");
	const [scope, setScope] = useState<MemoryScope>(
		initialScope || (hasProject ? "project" : "global"),
	);

	const advance = (from: Step) => {
		const next = nextStep(from, needs);
		setStep(next);
		return next;
	};

	if (step === "done") return null;

	const preview = (
		<Box flexDirection="column">
			{text && (
				<Box>
					<Text dimColor>Memory: </Text>
					<Text>{text.length > 60 ? `${text.slice(0, 60)}...` : text}</Text>
				</Box>
			)}
			{step === "tags" && (
				<Box>
					<Text dimColor>Store in: </Text>
					<Text color="yellow">{scope}</Text>
				</Box>
			)}
		</Box>
	);

	if (step === "text") {
		return (
			<TextInput
				message="What do you want to remember?"
				placeholder="type your memory here"
				onSubmit={(val) => {
					if (!val.trim()) return;
					setText(val);
					const next = advance("text");
					if (next === "done") {
						onComplete({ text: val, scope, tags: parseTags(initialTags) });
					}
				}}
			/>
		);
	}

	if (step === "scope") {
		return (
			<Box flexDirection="column" gap={1}>
				{preview}
				<Select
					message="Where do you want to store this?"
					options={[
						{ label: "Project", value: "project", description: "in this repo (.axon/)" },
						{ label: "Global", value: "global", description: "across all projects (~/.axon/)" },
					]}
					onSelect={(val) => {
						setScope(val as MemoryScope);
						const next = advance("scope");
						if (next === "done") {
							onComplete({ text, scope: val as MemoryScope, tags: parseTags(initialTags) });
						}
					}}
				/>
			</Box>
		);
	}

	if (step === "tags") {
		return (
			<Box flexDirection="column" gap={1}>
				{preview}
				<TextInput
					message="Tags (comma-separated, enter to skip):"
					placeholder="e.g. auth, jwt, security"
					onSubmit={(val) => {
						setStep("done");
						onComplete({ text, scope, tags: parseTags(val) });
					}}
				/>
			</Box>
		);
	}

	return null;
}
