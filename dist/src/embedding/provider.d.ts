export type EmbeddingApiKeyResolver = () => Promise<string | undefined>;
export declare function getCurrentEmbeddingModel(): string;
export declare function setEmbeddingApiKeyResolver(resolver: EmbeddingApiKeyResolver | undefined): void;
export declare function dispose(): Promise<void>;
export declare function prepareForShutdown(): Promise<void>;
export declare function embedTexts(texts: string[], prefix: "query" | "passage", signal?: AbortSignal): Promise<Float32Array[]>;
export declare function embedQuery(text: string): Promise<Float32Array>;
export declare function embedDocuments(texts: string[], signal?: AbortSignal): Promise<Float32Array[]>;
