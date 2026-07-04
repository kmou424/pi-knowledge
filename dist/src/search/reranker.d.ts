export declare function disposeReranker(): Promise<void>;
export declare function prepareRerankerForShutdown(): Promise<void>;
export interface RerankCandidate {
    chunkId: string;
    content: string;
}
export declare function rerank(query: string, candidates: RerankCandidate[], topK: number): Promise<Array<{
    chunkId: string;
    score: number;
}>>;
