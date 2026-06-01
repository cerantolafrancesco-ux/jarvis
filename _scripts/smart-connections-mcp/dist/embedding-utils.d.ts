/**
 * Embedding utilities for vector similarity calculations
 */
/**
 * Calculate cosine similarity between two vectors
 */
export declare function cosineSimilarity(vecA: number[], vecB: number[]): number;
/**
 * Find k nearest neighbors using cosine similarity
 */
export declare function findNearestNeighbors(queryVec: number[], vectors: Array<{
    id: string;
    vec: number[];
    metadata?: any;
}>, k: number, threshold?: number): Array<{
    id: string;
    similarity: number;
    metadata?: any;
}>;
/**
 * Normalize a vector to unit length
 */
export declare function normalizeVector(vec: number[]): number[];
//# sourceMappingURL=embedding-utils.d.ts.map