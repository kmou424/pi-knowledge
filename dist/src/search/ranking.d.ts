import type { Chunk } from "../storage/sqlite.ts";
export declare const MIN_HYBRID_SCORE = 0.18;
export declare const FILE_TYPE_ALIASES: Record<string, string>;
export interface RankingDiagnostics {
    adjusted_score: number;
    base_score: number;
    coverage: number;
    documentation_boost: number;
    is_localization: boolean;
    is_test: boolean;
    localization_penalty: number;
    path_boost: number;
    source_boost: number;
    test_intent: boolean;
    user_guide_intent: boolean;
}
export declare function normalizeFileTypeFilter(fileType: string | undefined): string | undefined;
export declare function isTestPath(filePath: string): boolean;
export declare function queryAsksForTests(queryTokens: Set<string>): boolean;
export declare function isLocalizationPath(filePath: string, fileType: string): boolean;
export declare function queryCoverage(text: string, queryTokens: Set<string>): number;
export declare function hasAnyLexicalEvidence(text: string, queryTokens: Set<string>): boolean;
export declare function pathTokenBoost(filePath: string, queryTokens: Set<string>): number;
export declare function basenameTokenBoost(filePath: string, queryTokens: Set<string>): number;
export declare function sourceFileBoost(chunk: Pick<Chunk, "file_path" | "file_type">, queryTokens: Set<string>): number;
export declare function scoreChunkForQuery(baseScore: number, chunk: Chunk, queryTokens: Set<string>): RankingDiagnostics;
export declare function hasEnoughLexicalEvidence(chunk: Chunk, queryTokens: Set<string>): boolean;
