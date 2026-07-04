import { openVectorReader } from "../embedding/vectors.js";
function cosine(a, b) {
    let dot = 0;
    for (let i = 0; i < a.length; i++)
        dot += a[i] * b[i];
    return dot;
}
function keepTopK(top, item, vector, limit) {
    if (limit <= 0)
        return;
    if (top.length < limit) {
        const stored = { ...item, vector: new Float32Array(vector) };
        top.push(stored);
        top.sort((a, b) => a.score - b.score);
        return;
    }
    if (item.score <= top[0].score)
        return;
    const stored = { ...item, vector: new Float32Array(vector) };
    top[0] = stored;
    top.sort((a, b) => a.score - b.score);
}
export function searchVector(queryVec, vectors, chunkIds, limit = 50) {
    const scores = vectors.map((v, i) => ({ chunkId: chunkIds[i], score: cosine(queryVec, v) }));
    scores.sort((a, b) => b.score - a.score);
    return scores.slice(0, limit);
}
export function searchVectorFile(queryVec, vectorPath, chunkIds, limit = 50) {
    const reader = openVectorReader(vectorPath);
    if (!reader)
        return { results: [], vectorsByChunkId: new Map() };
    try {
        if (reader.dim !== queryVec.length)
            return { results: [], vectorsByChunkId: new Map() };
        const scratch = new Float32Array(reader.dim);
        const top = [];
        let i = 0;
        for (const chunkIdRef of chunkIds) {
            if (i >= reader.count)
                break;
            const vectorIndex = i;
            i++;
            if (!reader.readInto(vectorIndex, scratch))
                continue;
            const chunkId = typeof chunkIdRef === "string" ? chunkIdRef : chunkIdRef.id;
            keepTopK(top, { chunkId, score: cosine(queryVec, scratch) }, scratch, limit);
        }
        const sorted = top.sort((a, b) => b.score - a.score);
        const vectorsByChunkId = new Map(sorted.map((item) => [item.chunkId, item.vector]));
        return {
            results: sorted.map(({ chunkId, score }) => ({ chunkId, score })),
            vectorsByChunkId,
        };
    }
    finally {
        reader.close();
    }
}
