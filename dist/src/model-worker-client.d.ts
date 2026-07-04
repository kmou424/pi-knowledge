export declare function embedInModelWorker(texts: string[], prefix: "query" | "passage", signal?: AbortSignal): Promise<Float32Array[]>;
export interface RerankWorkerCandidate {
    chunkId: string;
    content: string;
}
export declare function rerankInModelWorker(query: string, candidates: RerankWorkerCandidate[], topK: number): Promise<Array<{
    chunkId: string;
    score: number;
}>>;
export declare function shutdownModelWorker(): void;
