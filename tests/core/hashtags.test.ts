import { describe, expect, it } from "vitest";
import { extractHashtags } from "../../src/core/hashtags.js";

describe("extractHashtags", () => {
	it("extracts a single hashtag", () => {
		const result = extractHashtags("Auth uses JWT #auth");
		expect(result.tags).toEqual(["auth"]);
		expect(result.content).toBe("Auth uses JWT");
	});

	it("extracts multiple hashtags", () => {
		const result = extractHashtags("Auth uses JWT #auth #jwt #security");
		expect(result.tags).toEqual(["auth", "jwt", "security"]);
		expect(result.content).toBe("Auth uses JWT");
	});

	it("returns empty tags when no hashtags", () => {
		const result = extractHashtags("Auth uses JWT tokens");
		expect(result.tags).toEqual([]);
		expect(result.content).toBe("Auth uses JWT tokens");
	});

	it("handles hashtags at start of text", () => {
		const result = extractHashtags("#deploy run npm publish");
		expect(result.tags).toEqual(["deploy"]);
		expect(result.content).toBe("run npm publish");
	});

	it("handles hashtags in middle of text", () => {
		const result = extractHashtags("Use #prisma for the #database layer");
		expect(result.tags).toEqual(["prisma", "database"]);
		expect(result.content).toBe("Use for the layer");
	});

	it("collapses extra spaces after removal", () => {
		const result = extractHashtags("Auth  #auth  uses  #jwt  tokens");
		expect(result.tags).toEqual(["auth", "jwt"]);
		expect(result.content).toBe("Auth uses tokens");
	});

	it("handles hashtags with hyphens and underscores", () => {
		const result = extractHashtags("Config #my-tag #another_tag here");
		expect(result.tags).toEqual(["my-tag", "another_tag"]);
		expect(result.content).toBe("Config here");
	});

	it("handles empty text", () => {
		const result = extractHashtags("");
		expect(result.tags).toEqual([]);
		expect(result.content).toBe("");
	});

	it("handles text that is only hashtags", () => {
		const result = extractHashtags("#auth #jwt");
		expect(result.tags).toEqual(["auth", "jwt"]);
		expect(result.content).toBe("");
	});
});
