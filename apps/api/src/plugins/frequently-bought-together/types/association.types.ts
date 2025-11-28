/**
 * Display context for recommendations
 */
export enum DisplayContext {
    PDP_RELATED = 'PDP_RELATED',
    PDP_ADD_TO_CART = 'PDP_ADD_TO_CART',
    CART = 'CART',
    CHECKOUT = 'CHECKOUT'
}

/**
 * Input for association calculation
 */
export interface AssociationCalculationInput {
    timeWindowDays: number;
    minCooccurrenceThreshold: number;
    minScoreThreshold: number;
    channelId?: string;
}

/**
 * Individual score components for an association
 */
export interface AssociationScore {
    frequencyScore: number;  // 0-1
    recencyScore: number;    // 0-1
    valueScore: number;      // 0-1
    finalScore: number;      // weighted combination
    lift?: number;           // optional lift metric
}

/**
 * Product recommendation for GraphQL response
 */
export interface ProductRecommendation {
    productId: string;
    score: number;
    reason?: string;
}

/**
 * Co-occurrence data for a product pair
 */
export interface ProductPairData {
    sourceProductId: string;
    targetProductId: string;
    cooccurrenceCount: number;
    orderDates: Date[];
    cartValues: number[];
}

/**
 * Statistics for association calculation
 */
export interface AssociationStats {
    totalAssociations: number;
    lastCalculated?: Date;
    productsWithRecommendations: number;
    averageRecommendationsPerProduct: number;
    calculationDurationMs?: number;
}

/**
 * Settings for association calculation weights
 */
export interface ScoringWeights {
    frequency: number;  // default 0.5
    recency: number;    // default 0.3
    value: number;      // default 0.2
}

/**
 * Display location settings
 */
export interface DisplayLocations {
    pdpRelatedSection: boolean;
    pdpUnderAddToCart: boolean;
    cartPage: boolean;
    checkoutPage: boolean;
}
