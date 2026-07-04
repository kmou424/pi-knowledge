import type { ChunkInsert } from "../../storage/sqlite.ts";
export declare function chunkWithAST(content: string, filePath: string, language: string): Promise<Omit<ChunkInsert, "kb_id">[]>;
export declare const SUPPORTED_LANGUAGES: Set<string>;
