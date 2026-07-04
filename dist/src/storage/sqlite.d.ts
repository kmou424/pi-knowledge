import type Database from "better-sqlite3";
export interface KnowledgeBase {
    id: string;
    name: string;
    description: string | null;
    source_path: string | null;
    source_type: "file" | "directory" | "text" | "url";
    source_options: string | null;
    created_at: number;
    updated_at: number;
    chunk_count: number;
    file_count: number;
    embedding_model: string;
    status: "ready" | "indexing" | "error" | "stale";
}
export interface IndexingJob {
    kb_id: string;
    operation: "add" | "update" | "import";
    status: "running" | "succeeded" | "failed" | "cancelled";
    phase: string;
    message: string;
    started_at: number;
    updated_at: number;
    last_progress_at: number;
    processed_files: number;
    processed_chunks: number;
    total_files: number | null;
    skipped_total: number;
    added_chunks: number;
    removed_chunks: number;
    unchanged_chunks: number;
    error_message: string | null;
}
export interface Chunk {
    id: string;
    kb_id: string;
    content_hash: string;
    content: string;
    content_tokenized: string;
    file_path: string;
    file_type: string;
    start_line: number;
    end_line: number;
    metadata_json: string;
    indexed_at: number;
}
export type ChunkInsert = Omit<Chunk, "id" | "kb_id" | "indexed_at">;
export declare function getDefaultKnowledgeDir(): string;
export declare function resolveHostKnowledgeDir(hostRoot: string, options?: {
    legacyPiDir?: string;
    exists?: (path: string) => boolean;
}): string;
export declare function openDatabase(knowledgeDir?: string): Database.Database;
export declare function createKB(db: Database.Database, opts: {
    name: string;
    description?: string;
    source_path?: string;
    source_type: KnowledgeBase["source_type"];
    source_options?: string;
    embedding_model?: string;
}): KnowledgeBase;
export declare function getKB(db: Database.Database, id: string): KnowledgeBase | undefined;
export declare function getKBByName(db: Database.Database, name: string): KnowledgeBase | undefined;
export declare function listKBs(db: Database.Database): KnowledgeBase[];
export declare function deleteKB(db: Database.Database, id: string): void;
export declare function updateKBStatus(db: Database.Database, id: string, status: KnowledgeBase["status"]): void;
export declare function updateKBCounts(db: Database.Database, id: string, chunkCount: number, fileCount: number): void;
export declare function startIndexingJob(db: Database.Database, kbId: string, operation: IndexingJob["operation"], message: string): void;
export declare function updateIndexingJob(db: Database.Database, kbId: string, progress: {
    phase?: string;
    message?: string;
    processed_files?: number;
    processed_chunks?: number;
    total_files?: number | null;
    skipped_total?: number;
    added_chunks?: number;
    removed_chunks?: number;
    unchanged_chunks?: number;
}): void;
export declare function finishIndexingJob(db: Database.Database, kbId: string, status: Extract<IndexingJob["status"], "succeeded" | "failed" | "cancelled">, message: string, errorMessage?: string): void;
export declare function getIndexingJob(db: Database.Database, kbId: string): IndexingJob | undefined;
export declare function insertChunks(db: Database.Database, kbId: string, chunks: ChunkInsert[]): void;
export declare function getChunksByKB(db: Database.Database, kbId: string): Chunk[];
export declare function iterateChunksByKB(db: Database.Database, kbId: string): IterableIterator<Chunk>;
export declare function getChunkIdsByKB(db: Database.Database, kbId: string): string[];
export declare function iterateChunkIdsByKB(db: Database.Database, kbId: string): IterableIterator<{
    id: string;
}>;
export declare function getChunkById(db: Database.Database, id: string): Chunk | undefined;
export declare function getChunksByFile(db: Database.Database, kbId: string, filePath: string, startLine: number, endLine: number): Chunk[];
export declare function getChunkByRowid(db: Database.Database, rowid: number): Chunk | undefined;
export declare function deleteChunksByKB(db: Database.Database, kbId: string): void;
export declare function deleteChunksByIds(db: Database.Database, ids: string[]): void;
export declare function getChunkHashesByKB(db: Database.Database, kbId: string): Map<string, string>;
export declare function iterateChunkHashesByKB(db: Database.Database, kbId: string): IterableIterator<{
    id: string;
    content_hash: string;
}>;
export declare function getChunkCount(db: Database.Database, kbId: string): number;
export declare function getFileCount(db: Database.Database, kbId: string): number;
