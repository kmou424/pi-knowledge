export declare const STOP_WORDS: Set<string>;
export declare function stemToken(token: string): string;
export declare function tokenizeForSearch(text: string): Set<string>;
export declare function signalTokens(tokens: Set<string>): Set<string>;
export declare function normalizedQueryText(query: string): string;
