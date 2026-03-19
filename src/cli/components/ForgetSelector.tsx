import type { IndexEntry } from "../../core/types.js";
import { Select } from "./Select.js";

interface Props {
	memories: IndexEntry[];
	onSelect: (id: string) => void;
}

export function ForgetSelector({ memories, onSelect }: Props) {
	const options = memories.map((m) => ({
		label: `[${m.id}]`,
		value: m.id,
		description: m.summary.slice(0, 60),
	}));

	return (
		<Select message="Which memory do you want to forget?" options={options} onSelect={onSelect} />
	);
}
