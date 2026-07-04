import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { createSkippedScanStats, iterateScannableFiles, } from "../indexer/chunker.js";
import { getIndexingJob, iterateChunksByKB } from "../storage/sqlite.js";
const DEFAULT_STALE_INDEXING_MS = 10 * 60 * 1000;
function staleIndexingMs() {
    const configured = Number(process.env.PI_KNOWLEDGE_STALE_INDEXING_MS);
    return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_STALE_INDEXING_MS;
}
function scanOptionsFromSourceOptions(raw) {
    if (!raw)
        return {};
    try {
        const parsed = JSON.parse(raw);
        return {
            includeSuggestedText: parsed.include_suggested_text === true,
            includePaths: Array.isArray(parsed.include_paths)
                ? parsed.include_paths.filter((item) => typeof item === "string")
                : undefined,
            excludePaths: Array.isArray(parsed.exclude_paths)
                ? parsed.exclude_paths.filter((item) => typeof item === "string")
                : undefined,
        };
    }
    catch {
        return {};
    }
}
export function diagnoseKB(db, kb) {
    const statusAgeMs = Date.now() - kb.updated_at;
    const job = getIndexingJob(db, kb.id);
    const lastProgressAgeMs = job?.status === "running" ? Date.now() - job.last_progress_at : statusAgeMs;
    const result = {
        kb_id: kb.id,
        kb_name: kb.name,
        status: kb.status,
        status_age_ms: statusAgeMs,
        last_progress_age_ms: lastProgressAgeMs,
        stuck_indexing: kb.status === "indexing" && lastProgressAgeMs > staleIndexingMs(),
        stale_files: [],
        orphan_files: [],
        coverage_percent: 100,
        total_source_files: 0,
        indexed_files: kb.file_count,
        skipped_files: {
            total: 0,
            by_reason: {
                suggested_excluded: 0,
                oversized: 0,
                binary: 0,
                unreadable: 0,
                inaccessible: 0,
            },
            samples: [],
        },
        job,
    };
    if (!kb.source_path || kb.source_type === "url" || !existsSync(kb.source_path)) {
        return result; // text KBs or missing source — no diagnostics possible
    }
    // Scan current source files
    const currentFiles = new Set();
    const isDirectory = statSync(kb.source_path).isDirectory();
    try {
        if (isDirectory) {
            const skipped = createSkippedScanStats();
            for (const file of iterateScannableFiles(kb.source_path, skipped, scanOptionsFromSourceOptions(kb.source_options))) {
                currentFiles.add(file.relPath);
            }
            result.skipped_files = skipped;
        }
        else {
            currentFiles.add(kb.source_path);
        }
    }
    catch {
        return result;
    }
    result.total_source_files = currentFiles.size;
    result.coverage_percent = currentFiles.size > 0 ? Math.round((result.indexed_files / currentFiles.size) * 100) : 100;
    const indexedFilePaths = new Set();
    const latestIndexedByFile = new Map();
    for (const chunk of iterateChunksByKB(db, kb.id)) {
        indexedFilePaths.add(chunk.file_path);
        const currentLatest = latestIndexedByFile.get(chunk.file_path) ?? 0;
        if (chunk.indexed_at > currentLatest)
            latestIndexedByFile.set(chunk.file_path, chunk.indexed_at);
    }
    // Orphan detection: chunks referencing files no longer in source
    for (const filePath of indexedFilePaths) {
        if (!currentFiles.has(filePath)) {
            result.orphan_files.push(filePath);
        }
    }
    // Staleness detection: source files modified after last indexing
    for (const relPath of currentFiles) {
        const absPath = isDirectory ? join(kb.source_path, relPath) : relPath;
        try {
            const mtime = statSync(absPath).mtimeMs;
            const latestIndexed = latestIndexedByFile.get(relPath);
            if (latestIndexed !== undefined && mtime > latestIndexed) {
                result.stale_files.push(relPath);
            }
        }
        catch {
            /* file unreadable — skip */
        }
    }
    return result;
}
