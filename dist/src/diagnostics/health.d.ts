import type Database from "better-sqlite3";
import { type ScanResult } from "../indexer/chunker.ts";
import { type IndexingJob, type KnowledgeBase } from "../storage/sqlite.ts";
export interface DiagnosticResult {
    kb_id: string;
    kb_name: string;
    status: KnowledgeBase["status"];
    status_age_ms: number;
    last_progress_age_ms: number;
    stuck_indexing: boolean;
    stale_files: string[];
    orphan_files: string[];
    coverage_percent: number;
    total_source_files: number;
    indexed_files: number;
    skipped_files: ScanResult["skipped"];
    job?: IndexingJob;
}
export declare function diagnoseKB(db: Database.Database, kb: KnowledgeBase): DiagnosticResult;
