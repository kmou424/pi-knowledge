import { type DiagnosticResult } from "./diagnostics/health.ts";
import { createSkippedScanStats } from "./indexer/chunker.ts";
import { type RankingDiagnostics } from "./search/ranking.ts";
import { type KnowledgeBase } from "./storage/sqlite.ts";
export interface SearchOptions {
    mode?: "auto" | "fast" | "semantic" | "hybrid" | "deep" | "adaptive";
    limit?: number;
    offset?: number;
    kb_id?: string;
    filters?: {
        file_type?: string;
        path_pattern?: string;
    };
    diversity?: "off" | "balanced" | "strong";
}
export interface SearchResult {
    content: string;
    file_path: string;
    file_type: string;
    kb_name: string;
    score: number;
    snippet: string;
    start_line: number;
    end_line: number;
    ranking?: RankingDiagnostics;
}
export declare const CURRENT_EMBEDDING_MODEL: string;
export interface SearchResponse {
    results: SearchResult[];
    total_count: number;
    has_more: boolean;
    warnings?: string[];
    mode_used?: NonNullable<SearchOptions["mode"]>;
    retry_modes?: NonNullable<SearchOptions["mode"]>[];
    suggestions?: string[];
}
export type ProgressCallback = (msg: string) => void;
export interface AddOptions {
    include_suggested_text?: boolean;
    include_paths?: string[];
    exclude_paths?: string[];
}
export interface DoctorIssue {
    severity: "blocking" | "warning" | "info";
    kb_name?: string;
    message: string;
    action: string;
}
export interface DoctorReport {
    health_score: number;
    summary: string;
    issues: DoctorIssue[];
    diagnostics: DiagnosticResult[];
}
export interface IndexPlan {
    source_type: "file" | "directory" | "text" | "url";
    scannable_files: number;
    scannable_bytes: number;
    skipped: ReturnType<typeof createSkippedScanStats>;
    summary: string;
}
export declare class KnowledgeEngine {
    private db;
    private knowledgeDir;
    private activeUpdates;
    initialize(knowledgeDir: string): Promise<void>;
    plan(source: string, options?: AddOptions): IndexPlan;
    add(source: string, name: string, onProgress?: ProgressCallback, signal?: AbortSignal, options?: AddOptions): Promise<{
        kb: KnowledgeBase;
        chunkCount: number;
    }>;
    update(nameOrId: string, onProgress?: ProgressCallback, signal?: AbortSignal): Promise<{
        added: number;
        removed: number;
        unchanged: number;
    }>;
    private runUpdate;
    search(query: string, options?: SearchOptions): Promise<SearchResponse>;
    remove(nameOrId: string): boolean;
    list(): KnowledgeBase[];
    clear(): void;
    diagnose(): DiagnosticResult[];
    doctor(): DoctorReport;
    exportKB(nameOrId: string, outputPath: string): Promise<number>;
    importKB(inputPath: string, onProgress?: ProgressCallback, signal?: AbortSignal): Promise<{
        kb: KnowledgeBase;
        chunkCount: number;
    }>;
    dispose(options?: {
        disposeModels?: boolean;
    }): Promise<void>;
}
