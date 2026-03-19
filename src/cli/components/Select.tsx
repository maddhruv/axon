import { Box, Text, useApp, useInput, useStdin } from "ink";
import { useEffect, useState } from "react";

export interface SelectOption {
	label: string;
	value: string;
	description?: string;
}

interface SelectProps {
	message: string;
	options: SelectOption[];
	onSelect: (value: string) => void;
}

export function Select({ message, options, onSelect }: SelectProps) {
	const { exit } = useApp();
	const [selectedIdx, setSelectedIdx] = useState(0);

	useInput((input, key) => {
		if (key.upArrow) {
			setSelectedIdx((prev) => (prev > 0 ? prev - 1 : options.length - 1));
		}
		if (key.downArrow) {
			setSelectedIdx((prev) => (prev < options.length - 1 ? prev + 1 : 0));
		}
		if (key.return) {
			onSelect(options[selectedIdx].value);
		}
		if (input === "q" || key.escape) {
			exit();
		}
	});

	return (
		<Box flexDirection="column">
			<Text bold>{message}</Text>
			{options.map((option, i) => (
				<Box key={option.value} gap={1}>
					<Text color={i === selectedIdx ? "cyan" : "gray"}>{i === selectedIdx ? ">" : " "}</Text>
					<Text color={i === selectedIdx ? "cyan" : undefined} bold={i === selectedIdx}>
						{option.label}
					</Text>
					{option.description && <Text dimColor>- {option.description}</Text>}
				</Box>
			))}
		</Box>
	);
}

interface CheckboxProps {
	message: string;
	options: SelectOption[];
	onSubmit: (values: string[]) => void;
}

export function Checkbox({ message, options, onSubmit }: CheckboxProps) {
	const { exit } = useApp();
	const [focusIdx, setFocusIdx] = useState(0);
	const [checked, setChecked] = useState<Set<string>>(new Set());

	useInput((input, key) => {
		if (key.upArrow) {
			setFocusIdx((prev) => (prev > 0 ? prev - 1 : options.length - 1));
		}
		if (key.downArrow) {
			setFocusIdx((prev) => (prev < options.length - 1 ? prev + 1 : 0));
		}
		if (input === " ") {
			setChecked((prev) => {
				const next = new Set(prev);
				const val = options[focusIdx].value;
				if (next.has(val)) {
					next.delete(val);
				} else {
					next.add(val);
				}
				return next;
			});
		}
		if (key.return) {
			if (checked.size > 0) {
				onSubmit([...checked]);
			}
		}
		if (input === "q" || key.escape) {
			exit();
		}
	});

	return (
		<Box flexDirection="column">
			<Text bold>{message}</Text>
			{options.map((option, i) => {
				const isFocused = i === focusIdx;
				const isChecked = checked.has(option.value);
				return (
					<Box key={option.value} gap={1}>
						<Text color={isFocused ? "cyan" : "gray"}>{isFocused ? ">" : " "}</Text>
						<Text color={isChecked ? "green" : "gray"}>{isChecked ? "[x]" : "[ ]"}</Text>
						<Text color={isFocused ? "cyan" : undefined} bold={isFocused}>
							{option.label}
						</Text>
						{option.description && <Text dimColor>- {option.description}</Text>}
					</Box>
				);
			})}
			<Text dimColor>space to toggle, enter to confirm</Text>
		</Box>
	);
}

interface TextInputProps {
	message: string;
	placeholder?: string;
	onSubmit: (value: string) => void;
}

export function TextInput({ message, placeholder, onSubmit }: TextInputProps) {
	const [value, setValue] = useState("");
	const { setRawMode } = useStdin();

	useEffect(() => {
		setRawMode(true);
		return () => setRawMode(false);
	}, [setRawMode]);

	useInput((input, key) => {
		if (key.return) {
			onSubmit(value);
			return;
		}
		if (key.backspace || key.delete) {
			setValue((prev) => prev.slice(0, -1));
			return;
		}
		if (!key.ctrl && !key.meta && input) {
			setValue((prev) => prev + input);
		}
	});

	return (
		<Box>
			<Text bold>{message} </Text>
			{value ? <Text color="cyan">{value}</Text> : <Text dimColor>{placeholder || ""}</Text>}
			<Text color="cyan">|</Text>
		</Box>
	);
}
