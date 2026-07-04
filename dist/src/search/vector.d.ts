export interface VectorResult {
    chunkId: string;
    score: number;
}
export interface VectorFileSearchResult {
    results: VectorResult[];
    vectorsByChunkId: Map<string, Float32Array>;
}
type ChunkIdSource = Iterable<string | {
    id: string;
}>;
export declare function searchVector(queryVec: Float32Array, vectors: Float32Array[], chunkIds: string[], limit?: number): VectorResult[];
export declare function searchVectorFile(queryVec: Float32Array, vectorPath: string, chunkIds: ChunkIdSource, limit?: number): VectorFileSearchResult;
export {};
