import { normalizedQueryText } from "./query.js";
function prepareFtsTerms(query) {
    return normalizedQueryText(query)
        .split(/\s+/)
        .filter((t) => t.length > 0);
}
function quoteFtsTerm(term) {
    return `"${term.replace(/"/g, '""')}"`;
}
function runSearch(db, ftsQuery, limit, kbId) {
    if (kbId) {
        return db
            .prepare(`SELECT c.id as chunkId, -bm25(chunks_fts) as score
       FROM chunks_fts JOIN chunks c ON chunks_fts.rowid = c.rowid
       WHERE chunks_fts MATCH ? AND c.kb_id = ? ORDER BY bm25(chunks_fts) LIMIT ?`)
            .all(ftsQuery, kbId, limit);
    }
    return db
        .prepare(`SELECT c.id as chunkId, -bm25(chunks_fts) as score
     FROM chunks_fts JOIN chunks c ON chunks_fts.rowid = c.rowid
     WHERE chunks_fts MATCH ? ORDER BY bm25(chunks_fts) LIMIT ?`)
        .all(ftsQuery, limit);
}
export function searchBM25(db, query, limit = 50, kbId, options = {}) {
    const terms = prepareFtsTerms(query);
    if (terms.length === 0)
        return [];
    try {
        const quotedTerms = terms.map(quoteFtsTerm);
        const strict = runSearch(db, quotedTerms.join(" AND "), limit, kbId);
        if (strict.length > 0 || terms.length === 1 || options.allowOrFallback === false)
            return strict;
        return runSearch(db, quotedTerms.join(" OR "), limit, kbId);
    }
    catch {
        return [];
    }
}
