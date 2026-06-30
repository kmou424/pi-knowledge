import { beforeEach, describe, expect, it, vi } from "vitest";

const workerMock = vi.hoisted(() => ({
	embedInModelWorker: vi.fn(async () => [new Float32Array([0.5, 0.5])]),
}));

vi.mock("../../src/model-worker-client.ts", () => workerMock);

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
	return new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" }, ...init });
}

describe("embedding provider", () => {
	beforeEach(() => {
		vi.resetModules();
		vi.unstubAllEnvs();
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
		workerMock.embedInModelWorker.mockClear();
	});

	it("uses PI_KNOWLEDGE_EMBEDDING_BASE_URL for OpenAI-compatible embedding APIs", async () => {
		vi.stubEnv("PI_KNOWLEDGE_EMBEDDING", "openai:custom-embedding-model");
		vi.stubEnv("PI_KNOWLEDGE_EMBEDDING_BASE_URL", "http://127.0.0.1:8080/v1");
		vi.stubEnv("PI_KNOWLEDGE_EMBEDDING_API_KEY", "test-key");
		const fetchMock = vi.fn(async (_input: URL | string, _init?: RequestInit) =>
			jsonResponse({ data: [{ embedding: [0.1, 0.2] }] }),
		);
		vi.stubGlobal("fetch", fetchMock);

		const { embedDocuments } = await import("../../src/embedding/provider.ts");
		const vectors = await embedDocuments(["hello"]);

		expect(vectors[0]).toEqual(new Float32Array([0.1, 0.2]));
		expect(fetchMock).toHaveBeenCalledOnce();
		const [url, init] = fetchMock.mock.calls[0];
		expect(String(url)).toBe("http://127.0.0.1:8080/v1/embeddings");
		expect(init?.method).toBe("POST");
		expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer test-key");
		expect(workerMock.embedInModelWorker).not.toHaveBeenCalled();
	});

	it("derives the current embedding model from the configured provider", async () => {
		vi.stubEnv("PI_KNOWLEDGE_EMBEDDING", "openai:Qwen3-Embedding-0.6B");

		const { getCurrentEmbeddingModel } = await import("../../src/embedding/provider.ts");

		expect(getCurrentEmbeddingModel()).toBe("Qwen3-Embedding-0.6B");
	});

	it("prefers the configured auth resolver over PI_KNOWLEDGE_EMBEDDING_API_KEY", async () => {
		vi.stubEnv("PI_KNOWLEDGE_EMBEDDING", "openai:custom-embedding-model");
		vi.stubEnv("PI_KNOWLEDGE_EMBEDDING_API_KEY", "fallback-key");
		const fetchMock = vi.fn(async (_input: URL | string, _init?: RequestInit) =>
			jsonResponse({ data: [{ embedding: [0.1, 0.2] }] }),
		);
		vi.stubGlobal("fetch", fetchMock);

		const { embedDocuments, setEmbeddingApiKeyResolver } = await import("../../src/embedding/provider.ts");
		setEmbeddingApiKeyResolver(async () => "auth-json-key");
		await embedDocuments(["hello"]);

		const [, init] = fetchMock.mock.calls[0];
		expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer auth-json-key");
	});

	it("formats API query embeddings with the configured instruction", async () => {
		vi.stubEnv("PI_KNOWLEDGE_EMBEDDING", "openai:custom-embedding-model");
		vi.stubEnv("PI_KNOWLEDGE_EMBEDDING_API_KEY", "test-key");
		vi.stubEnv(
			"PI_KNOWLEDGE_EMBEDDING_QUERY_INSTRUCTION",
			"Given a user question about a software project, retrieve relevant code or documentation passages that answer it",
		);
		const fetchMock = vi.fn(async (_input: URL | string, _init?: RequestInit) =>
			jsonResponse({ data: [{ embedding: [0.1, 0.2] }] }),
		);
		vi.stubGlobal("fetch", fetchMock);

		const { embedQuery } = await import("../../src/embedding/provider.ts");
		await embedQuery("How is embedding auth configured?");

		const [, init] = fetchMock.mock.calls[0];
		const body = JSON.parse(String(init?.body)) as { input: string[] };
		expect(body.input[0]).toBe(
			"Instruct: Given a user question about a software project, retrieve relevant code or documentation passages that answer it\nQuery: How is embedding auth configured?",
		);
	});

	it("keeps API passage embeddings on the passage prefix when query instruction is configured", async () => {
		vi.stubEnv("PI_KNOWLEDGE_EMBEDDING", "openai:custom-embedding-model");
		vi.stubEnv("PI_KNOWLEDGE_EMBEDDING_API_KEY", "test-key");
		vi.stubEnv("PI_KNOWLEDGE_EMBEDDING_QUERY_INSTRUCTION", "Retrieve relevant passages");
		const fetchMock = vi.fn(async (_input: URL | string, _init?: RequestInit) =>
			jsonResponse({ data: [{ embedding: [0.1, 0.2] }] }),
		);
		vi.stubGlobal("fetch", fetchMock);

		const { embedDocuments } = await import("../../src/embedding/provider.ts");
		await embedDocuments(["Embedding authentication reads auth.json first."]);

		const [, init] = fetchMock.mock.calls[0];
		const body = JSON.parse(String(init?.body)) as { input: string[] };
		expect(body.input[0]).toBe("passage: Embedding authentication reads auth.json first.");
	});

	it("surfaces API embedding failures by default instead of silently falling back", async () => {
		vi.stubEnv("PI_KNOWLEDGE_EMBEDDING", "openai:custom-embedding-model");
		vi.stubEnv("OPENAI_BASE_URL", "http://127.0.0.1:8080/v1");
		vi.stubEnv("PI_KNOWLEDGE_EMBEDDING_API_KEY", "test-key");
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response("context window exceeded", { status: 400 })),
		);

		const { embedDocuments } = await import("../../src/embedding/provider.ts");

		await expect(embedDocuments(["hello"])).rejects.toThrow("OpenAI embedding API error: 400 context window exceeded");
		expect(workerMock.embedInModelWorker).not.toHaveBeenCalled();
	});

	it("bounds API embedding input length with a configurable safety cap", async () => {
		vi.stubEnv("PI_KNOWLEDGE_EMBEDDING", "openai:custom-embedding-model");
		vi.stubEnv("PI_KNOWLEDGE_EMBEDDING_MAX_CHARS", "32");
		vi.stubEnv("PI_KNOWLEDGE_EMBEDDING_API_KEY", "test-key");
		const fetchMock = vi.fn(async (_input: URL | string, _init?: RequestInit) =>
			jsonResponse({ data: [{ embedding: [0.1, 0.2] }] }),
		);
		vi.stubGlobal("fetch", fetchMock);

		const { embedDocuments } = await import("../../src/embedding/provider.ts");
		await embedDocuments(["x".repeat(100)]);

		const [, init] = fetchMock.mock.calls[0];
		const body = JSON.parse(String(init?.body)) as { input: string[] };
		expect(body.input[0]).toHaveLength(32);
		expect(body.input[0]).toBe("passage: xxxxxxxxxxxxxxxxxxxxxxx");
	});

	it("falls back to the local worker only when explicitly requested", async () => {
		vi.stubEnv("PI_KNOWLEDGE_EMBEDDING", "openai:custom-embedding-model");
		vi.stubEnv("PI_KNOWLEDGE_EMBEDDING_API_FALLBACK", "local");
		vi.stubEnv("PI_KNOWLEDGE_EMBEDDING_API_KEY", "test-key");
		vi.stubGlobal(
			"fetch",
			vi.fn(async () => new Response("temporary failure", { status: 503 })),
		);
		vi.spyOn(console, "warn").mockImplementation(() => {});

		const { embedDocuments } = await import("../../src/embedding/provider.ts");
		const vectors = await embedDocuments(["hello"]);

		expect(vectors[0]).toEqual(new Float32Array([0.5, 0.5]));
		expect(workerMock.embedInModelWorker).toHaveBeenCalledOnce();
		expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("falling back to local model"));
	});
});
