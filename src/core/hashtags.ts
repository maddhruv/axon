const HASHTAG_REGEX = /#([a-zA-Z0-9_-]+)/g;

export function extractHashtags(text: string): { content: string; tags: string[] } {
	const tags: string[] = [];

	for (const match of text.matchAll(HASHTAG_REGEX)) {
		tags.push(match[1]);
	}

	const content = text
		.replace(HASHTAG_REGEX, "")
		.replace(/\s{2,}/g, " ")
		.trim();

	return { content, tags };
}
