import type Database from "better-sqlite3";
export interface BM25Result {
    chunkId: string;
    score: number;
}
export declare function searchBM25(db: Database.Database, query: string, limit?: number, kbId?: string, options?: {
    allowOrFallback?: boolean;
}): BM25Result[];
