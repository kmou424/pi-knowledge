export interface VectorWriter {
    append(vectors: Float32Array[]): void;
    close(): void;
}
export interface VectorReader {
    count: number;
    dim: number;
    read(index: number): Float32Array | undefined;
    readInto(index: number, target: Float32Array): boolean;
    close(): void;
}
export declare function openVectorWriter(path: string): VectorWriter;
export declare function openVectorReader(path: string): VectorReader | undefined;
export declare function saveVectors(path: string, vectors: Float32Array[]): void;
export declare function loadVectors(path: string): Float32Array[];
