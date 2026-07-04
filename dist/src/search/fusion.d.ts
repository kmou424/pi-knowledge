export interface FusionResult {
    chunkId: string;
    score: number;
}
export declare function reciprocalRankFusion(lists: Array<{
    chunkId: string;
    score: number;
}[]>, k?: number): FusionResult[];
export declare function weightedScoreFusion(bm25Results: Array<{
    chunkId: string;
    score: number;
}>, vectorResults: Array<{
    chunkId: string;
    score: number;
}>, weights?: {
    bm25: number;
    vector: number;
    overlap: number;
}): FusionResult[];
