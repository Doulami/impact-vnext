/**
 * Bundle UI Types
 * 
 * Phase 4.2 Implementation - Bundle Plugin v2
 * 
 * TypeScript types for Angular UI components, matching the GraphQL schema
 * and providing type safety for the Admin UI components.
 */

export interface Bundle {
    id: string;
    createdAt: string;
    updatedAt: string;
    name: string;
    slug?: string;
    description?: string;
    status: BundleStatus;
    discountType: BundleDiscountType;
    fixedPrice?: number;
    percentOff?: number;
    version: number;
    assets: string[];
    price: number;
    enabled: boolean; // Legacy compatibility
    tags?: string[];
    category?: string;
    allowExternalPromos: boolean;
    items: BundleItem[];
    
    // Phase 4.1 audit fields
    brokenReason?: string;
    lastRecomputedAt?: string;
    
    // Computed fields
    isAvailable: boolean;
    effectivePrice: number;
    totalSavings: number;
}

export interface BundleItem {
    id: string;
    createdAt: string;
    updatedAt: string;
    productVariant: ProductVariant;
    quantity: number;
    unitPrice: number; // Legacy compatibility
    unitPriceSnapshot: number;
    weight?: number;
    displayOrder: number;
}

export interface ProductVariant {
    id: string;
    name: string;
    price: number;
    enabled: boolean;
    stockOnHand: number;
    trackInventory: boolean;
    product: Product;
}

export interface Product {
    id: string;
    name: string;
    slug: string;
    enabled: boolean;
    featuredAsset?: Asset;
}

export interface Asset {
    id: string;
    name: string;
    preview: string;
    source: string;
}

export enum BundleStatus {
    DRAFT = 'DRAFT',
    ACTIVE = 'ACTIVE',
    BROKEN = 'BROKEN',
    ARCHIVED = 'ARCHIVED'
}

export enum BundleDiscountType {
    FIXED = 'fixed',
    PERCENT = 'percent'
}

// Bundle list query types
export interface BundleListOptions {
    skip?: number;
    take?: number;
    sort?: BundleSortParameter;
    filter?: BundleFilterParameter;
}

export interface BundleSortParameter {
    id?: SortOrder;
    createdAt?: SortOrder;
    updatedAt?: SortOrder;
    name?: SortOrder;
    price?: SortOrder;
    status?: SortOrder;
}

export interface BundleFilterParameter {
    enabled?: BooleanOperators;
    status?: StringOperators;
    name?: StringOperators;
    category?: StringOperators;
    discountType?: StringOperators;
}

export enum SortOrder {
    ASC = 'ASC',
    DESC = 'DESC'
}

export interface StringOperators {
    eq?: string;
    notEq?: string;
    contains?: string;
    notContains?: string;
    in?: string[];
    notIn?: string[];
    regex?: string;
    isNull?: boolean;
}

export interface BooleanOperators {
    eq?: boolean;
    isNull?: boolean;
}

// Phase 4.2: Bundle lifecycle and validation types
export interface BundleIntegrityResult {
    isValid: boolean;
    issues: BundleIntegrityIssue[];
}

export interface BundleIntegrityIssue {
    type: string;
    variantId: string;
    message: string;
}

export interface VariantDeletionCheck {
    canDelete: boolean;
    blockingBundles: BundleReference[];
}

export interface BundleReference {
    id: string;
    name: string;
    status: string;
}

export interface BundleLifecycleStats {
    totalBundles: number;
    draftBundles: number;
    activeBundles: number;
    brokenBundles: number;
    archivedBundles: number;
    recentTransitions: BundleTransition[];
}

export interface BundleTransition {
    bundleId: string;
    bundleName: string;
    fromStatus: string;
    toStatus: string;
    timestamp: string;
    reason?: string;
}

// Bundle editor types
export interface CreateBundleInput {
    name: string;
    slug?: string;
    description?: string;
    discountType: BundleDiscountType;
    fixedPrice?: number;
    percentOff?: number;
    assets: string[];
    tags?: string[];
    category?: string;
    allowExternalPromos?: boolean;
    items: CreateBundleItemInput[];
}

export interface UpdateBundleInput {
    id: string;
    name?: string;
    slug?: string;
    description?: string;
    discountType?: BundleDiscountType;
    fixedPrice?: number;
    percentOff?: number;
    assets?: string[];
    tags?: string[];
    category?: string;
    allowExternalPromos?: boolean;
    items?: UpdateBundleItemInput[];
}

export interface CreateBundleItemInput {
    productVariantId: string;
    quantity: number;
    weight?: number;
    displayOrder?: number;
}

export interface UpdateBundleItemInput {
    id?: string;
    productVariantId: string;
    quantity: number;
    weight?: number;
    displayOrder?: number;
}

// Bundle availability types
export interface BundleAvailability {
    isAvailable: boolean;
    maxQuantity: number;
    status: string;
    reason?: string;
}

export interface BundleStockValidation {
    valid: boolean;
    constrainingVariants: ProductVariant[];
    maxQuantityAvailable: number;
    message?: string;
}

// Bundle analytics types
export interface BundleAnalytics {
    bundleId: string;
    totalComponents: number;
    componentTotal: number;
    bundlePrice: number;
    totalSavings: number;
    savingsPercentage: number;
    totalWeight: number;
    enabled: boolean;
    availabilityStatus: BundleStockValidation;
}

// Bundle health types
export interface BundleHealthStatus {
    bundleId: string;
    bundleName: string;
    status: BundleStatus;
    isHealthy: boolean;
    healthIssues: BundleHealthIssue[];
    lastChecked: string;
}

export interface BundleHealthIssue {
    type: 'component_unavailable' | 'component_price_changed' | 'component_out_of_stock' | 'validation_error';
    severity: 'critical' | 'warning' | 'info';
    message: string;
    componentId?: string;
    componentName?: string;
    suggestedAction?: string;
}

// UI state types
export interface BundleEditorState {
    bundle: Bundle | null;
    isDirty: boolean;
    isLoading: boolean;
    errors: string[];
    validationErrors: Record<string, string[]>;
}

export interface ComponentSearchResult {
    variant: ProductVariant;
    alreadyInBundle: boolean;
    conflictsWith?: string[];
}

// Form validation types
export interface BundleValidationResult {
    isValid: boolean;
    errors: BundleValidationError[];
}

export interface BundleValidationError {
    field: string;
    message: string;
    code: string;
}

// Bulk operations types
export interface BulkBundleOperation {
    bundleIds: string[];
    operation: 'publish' | 'archive' | 'restore' | 'delete';
    reason?: string;
}

export interface BulkOperationResult {
    successCount: number;
    errors: Array<{
        bundleId: string;
        error: string;
    }>;
}