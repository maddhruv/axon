import { nanoid } from "nanoid";

export function generateId(): string {
	return `ax_${nanoid(10)}`;
}
