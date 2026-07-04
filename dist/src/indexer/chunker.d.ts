import type { ChunkInsert } from "../storage/sqlite.ts";
export interface ScanOptions {
    includeSuggestedText?: boolean;
    includePaths?: string[];
    excludePaths?: string[];
}
export interface ScannedFile {
    path: string;
    relPath: string;
    content: string;
    fileType: string;
}
export interface ScannableFile {
    path: string;
    relPath: string;
    fileType: string;
    size: number;
}
export interface SkippedScanEntry {
    path: string;
    reason: "suggested_excluded" | "oversized" | "binary" | "unreadable" | "inaccessible";
    size?: number;
}
export interface ScanResult {
    files: ScannedFile[];
    skipped: {
        total: number;
        by_reason: Record<SkippedScanEntry["reason"], number>;
        samples: SkippedScanEntry[];
    };
}
export declare function createSkippedScanStats(): ScanResult["skipped"];
export declare function summarizeSkippedScan(skipped: ScanResult["skipped"]): string;
export declare function iterateScannableFiles(dirPath: string, skipped?: ScanResult["skipped"], options?: ScanOptions): Generator<ScannableFile>;
export declare function iterateScannedFiles(dirPath: string, skipped?: ScanResult["skipped"], options?: ScanOptions): Generator<ScannedFile>;
export declare function iterateScannedFilesAsync(dirPath: string, onFile: (file: ScannedFile) => Promise<void> | void, skipped?: ScanResult["skipped"], options?: ScanOptions): Promise<ScanResult["skipped"]>;
export declare function walkDir(dirPath: string, options?: ScanOptions): ScannedFile[];
export declare function walkDirDetailed(dirPath: string, options?: ScanOptions): ScanResult;
export declare function isReadableTextFile(filePath: string): boolean;
export declare function preTokenizeForFTS(content: string): string;
export declare function contentHash(content: string): string;
export declare function chunkIdentityHash(opts: {
    content: string;
    filePath: string;
    fileType: string;
    startLine: number;
    endLine: number;
    metadataJson: string;
}): string;
export declare function buildChunkEmbeddingText(chunk: Pick<ChunkInsert, "content" | "file_path" | "file_type" | "metadata_json">): string;
export declare function chunkMarkdown(content: string, filePath: string): Omit<ChunkInsert, "kb_id">[];
export declare function chunkText(content: string, filePath: string): Omit<ChunkInsert, "kb_id">[];
export declare function chunkFile(content: string, filePath: string): Promise<Omit<ChunkInsert, "kb_id">[]>;
