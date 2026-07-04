import { join } from "node:path";
import { getDefaultKnowledgeDir } from "./storage/sqlite.js";
let embeddingPipeline = null;
let rerankerPipeline = null;
function getModelCacheDir() {
    return process.env.PI_KNOWLEDGE_MODEL_CACHE_DIR ?? join(getDefaultKnowledgeDir(), "models");
}
function configureTransformersEnv(env) {
    const cacheDir = getModelCacheDir();
    env.cacheDir = cacheDir;
    if (process.env.PI_KNOWLEDGE_OFFLINE === "true") {
        env.allowRemoteModels = false;
        env.localModelPath = cacheDir;
    }
}
async function loadEmbeddingPipeline() {
    if (embeddingPipeline)
        return embeddingPipeline;
    const { pipeline, env } = await import("@huggingface/transformers");
    configureTransformersEnv(env);
    const createPipeline = pipeline;
    const loaded = (await createPipeline("feature-extraction", "Xenova/multilingual-e5-small", {
        quantized: true,
        dtype: "fp32",
    }));
    embeddingPipeline = loaded;
    return loaded;
}
async function loadRerankerPipeline() {
    if (rerankerPipeline)
        return rerankerPipeline;
    const { pipeline, env } = await import("@huggingface/transformers");
    configureTransformersEnv(env);
    const createPipeline = pipeline;
    const loaded = (await createPipeline("text-classification", "Xenova/ms-marco-MiniLM-L-4-v2"));
    rerankerPipeline = loaded;
    return loaded;
}
async function handleEmbed(request) {
    const pipe = await loadEmbeddingPipeline();
    const vectors = [];
    for (const text of request.texts) {
        const output = await pipe(`${request.prefix}: ${text}`, { pooling: "mean", normalize: true });
        vectors.push(Array.from(output.data));
    }
    return vectors;
}
async function handleRerank(request) {
    const pipe = await loadRerankerPipeline();
    const results = [];
    for (const candidate of request.candidates) {
        const output = await pipe({ text: request.query, text_pair: candidate.content });
        const score = Array.isArray(output) ? (output[0]?.score ?? 0) : (output?.score ?? 0);
        results.push({ chunkId: candidate.chunkId, score });
    }
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, request.topK);
}
process.on("message", (request) => {
    void (async () => {
        try {
            const result = request.type === "embed" ? await handleEmbed(request) : await handleRerank(request);
            process.send?.({ id: request.id, result });
        }
        catch (error) {
            process.send?.({ id: request.id, error: error instanceof Error ? error.message : String(error) });
        }
    })();
});
