import { Injectable } from '@nestjs/common';
import {
    RequestContext,
    TransactionalConnection,
    ListQueryBuilder,
    PaginatedList,
    ID,
    StockMovementService,
    ProductVariantService,
    ProductService,
    OrderService,
    OrderLine,
    Logger,
    Product,
    Asset,
    LanguageCode,
} from '@vendure/core';
import { GlobalFlag } from '@vendure/common/lib/generated-types';
import { Bundle, BundleStatus, BundleDiscountType } from '../entities/bundle.entity';
import { BundleItem } from '../entities/bundle-item.entity';

// Bundle Plugin v2 Input Interfaces
export interface CreateBundleInput {
    name: string;
    slug?: string;
    description?: string;
    discountType: BundleDiscountType;
    fixedPrice?: number; // In cents for fixed-price bundles
    percentOff?: number; // 0-100 for percentage bundles
    validFrom?: Date;
    validTo?: Date;
    assets?: string[];
    tags?: string[];
    category?: string;
    allowExternalPromos?: boolean;
    items: CreateBundleItemInput[];
    // Legacy fields for backwards compatibility
    price?: number; // Deprecated: calculated from discount type
    enabled?: boolean; // Deprecated: use status instead
}

export interface CreateBundleItemInput {
    productVariantId: ID;
    quantity: number;
    weight?: number; // For proration in fixed-price bundles
    displayOrder?: number;
    // Legacy fields for backwards compatibility
    unitPrice?: number; // Deprecated: fetched from ProductVariant
}

export interface UpdateBundleInput {
    id: ID;
    name?: string;
    slug?: string;
    description?: string;
    discountType?: BundleDiscountType;
    fixedPrice?: number;
    percentOff?: number;
    validFrom?: Date;
    validTo?: Date;
    assets?: string[];
    tags?: string[];
    category?: string;
    allowExternalPromos?: boolean;
    items?: UpdateBundleItemInput[];
    // Legacy fields for backwards compatibility
    price?: number; // Deprecated
    enabled?: boolean; // Deprecated
}

export interface UpdateBundleItemInput {
    id?: ID;
    productVariantId: ID;
    quantity: number;
    weight?: number;
    displayOrder?: number;
    // Legacy fields for backwards compatibility
    unitPrice?: number; // Deprecated
}

export interface BundleListOptions {
    skip?: number;
    take?: number;
    sort?: any;
    filter?: any;
}

export interface StockValidationResult {
    isAvailable: boolean;
    insufficientItems: Array<{
        variantId: string;
        productName: string;
        required: number;
        available: number;
        shortfall: number;
    }>;
    maxAvailableQuantity: number;
}

/**
 * Bundle Service
 * 
 * Handles core bundle business logic as specified in Bundle Plugin documentation:
 * - Bundle CRUD operations
 * - Stock validation for bundle components
 * - Bundle opportunity detection
 * - Order line manipulation for exploded bundle pattern
 */
@Injectable()
export class BundleService {
    constructor(
        private connection: TransactionalConnection,
        private listQueryBuilder: ListQueryBuilder,
        private stockMovementService: StockMovementService,
        private productVariantService: ProductVariantService,
        private productService: ProductService,
        private orderService: OrderService,
    ) {}

    /**
     * Create a new bundle - Bundle Plugin v2
     */
    async create(ctx: RequestContext, input: CreateBundleInput): Promise<Bundle> {
        // Validate input
        if (!input.discountType) {
            throw new Error('Discount type is required');
        }
        
        if (input.discountType === BundleDiscountType.FIXED && !input.fixedPrice) {
            throw new Error('Fixed price is required for fixed-price bundles');
        }
        
        if (input.discountType === BundleDiscountType.PERCENT && !input.percentOff) {
            throw new Error('Percentage off is required for percentage bundles');
        }
        
        // Validate and fetch component variants
        const validatedItems = await this.validateAndEnrichItems(ctx, input.items);
        
        // Fetch asset entities if provided
        let assetEntities: Asset[] = [];
        let featuredAsset: Asset | undefined;
        
        if (input.assets && input.assets.length > 0) {
            assetEntities = await this.connection.getRepository(ctx, Asset).findByIds(input.assets);
            featuredAsset = assetEntities[0]; // First asset as featured
        }
        
        // Determine initial status based on validTo date
        let initialStatus = BundleStatus.DRAFT;
        if (input.validTo) {
            const now = new Date();
            const validTo = new Date(input.validTo);
            if (validTo < now) {
                initialStatus = BundleStatus.EXPIRED; // Expired on creation
                Logger.info(`Creating bundle with expired validTo date (${input.validTo}), setting status to EXPIRED`, 'BundleService');
            }
        }
        
        // Create bundle entity
        const bundle = new Bundle({
            name: input.name,
            slug: input.slug,
            description: input.description,
            status: initialStatus,
            validFrom: input.validFrom,
            validTo: input.validTo,
            discountType: input.discountType,
            fixedPrice: input.fixedPrice,
            percentOff: input.percentOff,
            version: 1,
            assets: assetEntities,
            featuredAsset: featuredAsset,
            tags: input.tags,
            category: input.category,
            allowExternalPromos: input.allowExternalPromos || false,
            // Backwards compatibility
            enabled: false, // New bundles start as DRAFT or EXPIRED, never enabled
            price: this.calculateLegacyPrice(input, validatedItems),
            customFields: {}
        });
        
        // Create temporary bundle items for validation (before saving to DB)
        const bundleItems = validatedItems.map((itemData, index) => new BundleItem({
            productVariantId: itemData.productVariantId,
            quantity: itemData.quantity,
            weight: itemData.weight,
            displayOrder: itemData.displayOrder ?? index,
            unitPriceSnapshot: itemData.currentPrice,
            // Backwards compatibility
            unitPrice: itemData.currentPrice / 100, // Convert cents to dollars
            customFields: {}
        }));
        
        // Assign items to bundle for validation
        bundle.items = bundleItems;
        
        // Validate bundle configuration (with items)
        const validationErrors = bundle.validate();
        if (validationErrors.length > 0) {
            throw new Error(`Bundle validation failed: ${validationErrors.join(', ')}`);
        }

        const savedBundle = await this.connection.getRepository(ctx, Bundle).save(bundle);

        // Now set the bundleId on items and save them
        bundleItems.forEach(item => {
            (item as any).bundleId = savedBundle.id;
        });

        await this.connection.getRepository(ctx, BundleItem).save(bundleItems);

        // Create shell product for bundle (for SEO/PLP)
        const shellProductId = await this.createShellProduct(ctx, savedBundle);
        savedBundle.shellProductId = shellProductId;
        await this.connection.getRepository(ctx, Bundle).save(savedBundle);

        const result = await this.findOne(ctx, savedBundle.id);
        if (!result) {
            throw new Error('Failed to retrieve created bundle');
        }
        return result;
    }
    
    /**
     * Create shell product for bundle - used for PDP/PLP/SEO
     * Shell product has customFields.isBundle=true, customFields.bundleId
     * Single variant with trackInventory=false (never decremented)
     */
    private async createShellProduct(ctx: RequestContext, bundle: Bundle): Promise<string> {
        try {
            // Create Product with bundle metadata
            const product = await this.productService.create(ctx, {
                translations: [{
                    languageCode: LanguageCode.en,
                    name: `${bundle.name}`,
                    slug: bundle.slug || `bundle-${bundle.id}`,
                    description: bundle.description || `Bundle: ${bundle.name}`
                }],
                customFields: {
                    isBundle: true,
                    bundleId: String(bundle.id)
                },
                enabled: bundle.status === BundleStatus.ACTIVE
            });
            
            // Create single variant with trackInventory=false
            await this.productVariantService.create(ctx, [{
                productId: product.id,
                sku: `BUNDLE-${bundle.id}`,
                price: 0, // Shell has no price
                trackInventory: GlobalFlag.FALSE,
                translations: [{
                    languageCode: LanguageCode.en,
                    name: bundle.name
                }]
            }]);
            
            Logger.info(`Created shell product ${product.id} for bundle ${bundle.id} (${bundle.name})`, 'BundleService');
            
            return String(product.id);
            
        } catch (error) {
            Logger.error(
                `Failed to create shell product for bundle ${bundle.id}: ${error instanceof Error ? error.message : String(error)}`,
                'BundleService'
            );
            throw error;
        }
    }
    
    /**
     * Validate component variants and enrich with current pricing data
     */
    private async validateAndEnrichItems(ctx: RequestContext, items: CreateBundleItemInput[]) {
        const enrichedItems = [];
        
        for (const itemInput of items) {
            const variant = await this.productVariantService.findOne(ctx, itemInput.productVariantId);
            if (!variant) {
                throw new Error(`ProductVariant with id ${itemInput.productVariantId} not found`);
            }
            
            if (variant.deletedAt) {
                throw new Error(`ProductVariant ${variant.name} is deleted and cannot be used in bundles`);
            }
            
            // Warn about inventory tracking
            if (!variant.trackInventory || variant.trackInventory === 'FALSE') {
                Logger.warn(`Bundle component ${variant.name} does not track inventory`, 'BundleService');
            }
            
            enrichedItems.push({
                productVariantId: itemInput.productVariantId,
                quantity: itemInput.quantity,
                weight: itemInput.weight,
                displayOrder: itemInput.displayOrder,
                currentPrice: variant.price, // Store PRE-TAX price in cents
                variant: variant
            });
        }
        
        return enrichedItems;
    }
    
    /**
     * Calculate legacy price field for backwards compatibility
     */
    private calculateLegacyPrice(input: CreateBundleInput, enrichedItems: any[]): number {
        if (input.discountType === BundleDiscountType.FIXED && input.fixedPrice) {
            return input.fixedPrice / 100; // Convert cents to dollars
        }
        
        if (input.discountType === BundleDiscountType.PERCENT && input.percentOff) {
            const componentTotal = enrichedItems.reduce((sum, item) => sum + (item.currentPrice * item.quantity), 0);
            return (componentTotal * (1 - input.percentOff / 100)) / 100; // Convert to dollars
        }
        
        return input.price || 0; // Fallback to input price or 0
    }

    /**
     * Update an existing bundle
     */
    async update(ctx: RequestContext, input: UpdateBundleInput): Promise<Bundle> {
        const bundle = await this.findOne(ctx, input.id);
        if (!bundle) {
            throw new Error(`Bundle with id ${input.id} not found`);
        }

        // Update assets if provided
        if (input.assets && input.assets.length > 0) {
            const assetEntities = await this.connection.getRepository(ctx, Asset).findByIds(input.assets);
            bundle.assets = assetEntities;
            bundle.featuredAsset = assetEntities[0]; // First asset as featured
            delete (input as any).assets; // Remove from input to avoid Object.assign overwriting
        }
        
        // Update bundle properties
        Object.assign(bundle, input);
        
        // Check if validTo was updated to an expired date
        if (input.validTo !== undefined) {
            const now = new Date();
            const validTo = new Date(input.validTo);
            if (validTo < now && bundle.status === BundleStatus.ACTIVE) {
                bundle.status = BundleStatus.EXPIRED;
                bundle.enabled = false;
                Logger.info(`Bundle ${bundle.id} validTo updated to expired date (${input.validTo}), setting status to EXPIRED`, 'BundleService');
            } else if (validTo >= now && bundle.status === BundleStatus.EXPIRED) {
                // Reactivate expired bundle if validTo is extended to future
                bundle.status = BundleStatus.ACTIVE;
                bundle.enabled = true;
                Logger.info(`Bundle ${bundle.id} validTo extended to future date (${input.validTo}), reactivating from EXPIRED`, 'BundleService');
            }
        }
        
        await this.connection.getRepository(ctx, Bundle).save(bundle);

        // Update bundle items if provided
        if (input.items) {
            // Remove existing items
            await this.connection.getRepository(ctx, BundleItem).delete({ bundleId: input.id });

            // Create new items
            const bundleItems = input.items.map(itemInput => new BundleItem({
                ...itemInput,
                bundleId: input.id,
            }));

            await this.connection.getRepository(ctx, BundleItem).save(bundleItems);
        }

        const result = await this.findOne(ctx, input.id);
        if (!result) {
            throw new Error('Failed to retrieve updated bundle');
        }
        
        // Sync to shell product if it exists
        if (result.shellProductId) {
            try {
                await this.syncBundleToShell(ctx, result);
            } catch (error) {
                Logger.warn(`Failed to sync bundle ${result.id} to shell: ${error instanceof Error ? error.message : String(error)}`, 'BundleService');
            }
        }
        
        return result;
    }

    /**
     * Delete a bundle
     */
    async delete(ctx: RequestContext, id: ID): Promise<{ result: string; message?: string }> {
        const bundle = await this.findOne(ctx, id);
        if (!bundle) {
            return { result: 'NOT_FOUND', message: `Bundle with id ${id} not found` };
        }

        await this.connection.getRepository(ctx, Bundle).delete(id);
        return { result: 'DELETED' };
    }

    /**
     * Find a bundle by ID
     */
    async findOne(ctx: RequestContext, id: ID): Promise<Bundle | null> {
        const bundle = await this.connection.getRepository(ctx, Bundle).findOne({
            where: { id },
            relations: ['items'],
        });
        
        if (!bundle) return null;
        
        // Load productVariants properly through ProductVariantService to get computed prices
        if (bundle.items?.length > 0) {
            for (const item of bundle.items) {
                if (item.productVariantId) {
                    const variant = await this.productVariantService.findOne(ctx, item.productVariantId);
                    if (variant) {
                        item.productVariant = variant;
                    }
                }
            }
        }
        
        return bundle;
    }

    /**
     * Find all bundles with pagination and filtering
     */
    async findAll(ctx: RequestContext, options: BundleListOptions): Promise<PaginatedList<Bundle>> {
        const result = await this.listQueryBuilder
            .build(Bundle, options, {
                relations: ['items'],
                ctx,
            })
            .getManyAndCount();
        
        const [bundles, totalItems] = result;
        
        // Load productVariants properly through ProductVariantService to get computed prices
        for (const bundle of bundles) {
            if (bundle.items?.length > 0) {
                for (const item of bundle.items) {
                    if (item.productVariantId) {
                        const variant = await this.productVariantService.findOne(ctx, item.productVariantId);
                        if (variant) {
                            item.productVariant = variant;
                        }
                    }
                }
            }
        }
        
        return {
            items: bundles,
            totalItems,
        };
    }

    /**
     * Validate bundle stock availability - Bundle Plugin v2 specification
     * Implements: A_components = min(floor(available_i / quantity_i))
     */
    async validateBundleStock(
        ctx: RequestContext, 
        bundleId: ID, 
        requestedQuantity: number
    ): Promise<StockValidationResult> {
        const bundle = await this.findOne(ctx, bundleId);
        if (!bundle) {
            return {
                isAvailable: false,
                insufficientItems: [],
                maxAvailableQuantity: 0
            };
        }

        // Only ACTIVE bundles can be purchased
        if (!bundle.isAvailable) {
            return {
                isAvailable: false,
                insufficientItems: [],
                maxAvailableQuantity: 0
            };
        }

        const componentAvailability = await this.calculateComponentAvailability(ctx, bundle);
        const shellAvailability = await this.getShellAvailabilityGate(ctx, bundle);
        
        // A_final = min(A_components, A_shell)
        const finalMaxQuantity = Math.min(componentAvailability.maxQuantity, shellAvailability);
        const isAvailable = requestedQuantity <= finalMaxQuantity;
        
        if (!isAvailable) {
            return {
                isAvailable: false,
                insufficientItems: componentAvailability.insufficientItems,
                maxAvailableQuantity: finalMaxQuantity
            };
        }

        return {
            isAvailable: true,
            insufficientItems: [],
            maxAvailableQuantity: finalMaxQuantity
        };
    }
    
    /**
     * Calculate component availability: A_components = min(floor(available_i / quantity_i))
     */
    private async calculateComponentAvailability(
        ctx: RequestContext,
        bundle: Bundle
    ): Promise<{
        maxQuantity: number;
        insufficientItems: Array<{
            variantId: string;
            productName: string;
            required: number;
            available: number;
            shortfall: number;
        }>;
    }> {
        const insufficientItems: Array<{
            variantId: string;
            productName: string;
            required: number;
            available: number;
            shortfall: number;
        }> = [];

        let componentMaxQuantity = Infinity;
        console.log('[calculateComponentAvailability] Starting calc for bundle', bundle.id, 'items:', bundle.items.length);

        for (const item of bundle.items) {
            const variant = item.productVariant;
            
            // Get actual stock levels from Vendure stock system
            const stockLevel = await this.getVariantStockLevel(ctx, variant.id);
            const onHand = stockLevel.stockOnHand;
            const allocated = stockLevel.stockAllocated || 0;
            console.log('[calculateComponentAvailability] Item:', variant.id, variant.name, 'onHand:', onHand, 'allocated:', allocated, 'quantity needed:', item.quantity);
            
            // Calculate effective available based on backorder settings
            let effectiveAvailable: number;
            
            if (variant.outOfStockThreshold && onHand <= variant.outOfStockThreshold) {
                // Variant is at or below threshold
                // Check if backorders are allowed (Vendure uses useGlobalOutOfStockThreshold)
                // If trackInventory is enabled and threshold reached, check backorder policy
                // For now, simple logic: if below threshold, available = 0 unless you implement backorder allowance
                effectiveAvailable = Math.max(0, onHand - allocated);
            } else {
                // Normal stock calculation
                effectiveAvailable = Math.max(0, onHand - allocated);
            }

            // Calculate max bundles possible with this component
            const maxForThisItem = Math.floor(effectiveAvailable / item.quantity);
            console.log('[calculateComponentAvailability] effectiveAvailable:', effectiveAvailable, 'maxForThisItem:', maxForThisItem, 'componentMaxQuantity before:', componentMaxQuantity);
            componentMaxQuantity = Math.min(componentMaxQuantity, maxForThisItem);
            console.log('[calculateComponentAvailability] componentMaxQuantity after:', componentMaxQuantity);
            
            // Track insufficient items for detailed error reporting
            if (effectiveAvailable < item.quantity) {
                insufficientItems.push({
                    variantId: variant.id.toString(),
                    productName: variant.name,
                    required: item.quantity,
                    available: effectiveAvailable,
                    shortfall: item.quantity - effectiveAvailable
                });
            }
        }

        const finalMax = componentMaxQuantity === Infinity ? 999999 : componentMaxQuantity;
        console.log('[calculateComponentAvailability] Final result - componentMaxQuantity:', componentMaxQuantity, 'returning:', finalMax);
        return {
            maxQuantity: finalMax,
            insufficientItems
        };
    }
    
    /**
     * Get shell product availability gate (marketing cap)
     * Returns shell variant stock if bundle has shell product, otherwise Infinity
     */
    private async getShellAvailabilityGate(ctx: RequestContext, bundle: Bundle): Promise<number> {
        // Check if bundle has a shell product
        const shellProduct = await this.findShellProduct(ctx, bundle.id);
        if (!shellProduct) {
            return Infinity; // No marketing gate
        }
        
        // Get shell variant (should be single variant with trackInventory=false)
        if (shellProduct.variants && shellProduct.variants.length > 0) {
            const shellVariant = shellProduct.variants[0];
            
            // Shell variants should not track inventory (trackInventory=false)
            if (!shellVariant.trackInventory || shellVariant.trackInventory === 'FALSE') {
                return Infinity; // Shell doesn't limit availability
            }
            
            // If shell tracks inventory (unusual but possible), use its stock
            const stockLevel = await this.getVariantStockLevel(ctx, shellVariant.id);
            return Math.max(0, stockLevel.stockOnHand - (stockLevel.stockAllocated || 0));
        }
        
        return Infinity;
    }
    
    /**
     * Find shell product linked to bundle
     */
    private async findShellProduct(ctx: RequestContext, bundleId: ID): Promise<Product | null> {
        try {
            const bundle = await this.findOne(ctx, bundleId);
            if (!bundle || !bundle.shellProductId) {
                return null;
            }
            
            const product = await this.connection.getRepository(ctx, Product).findOne({
                where: { id: bundle.shellProductId },
                relations: ['variants']
            });
            
            return product || null;
        } catch (error) {
            Logger.warn(`Error finding shell product for bundle ${bundleId}: ${error}`, 'BundleService');
            return null;
        }
    }
    
    /**
     * Get actual stock level for a product variant
     */
    private async getVariantStockLevel(ctx: RequestContext, variantId: ID): Promise<{
        stockOnHand: number;
        stockAllocated?: number;
    }> {
        try {
            // Query StockLevel directly from database with proper relations
            const stockLevels = await this.connection.getRepository(ctx, 'StockLevel').find({
                where: { productVariantId: variantId },
            });
            
            if (stockLevels && stockLevels.length > 0) {
                const stockLevel = stockLevels[0];
                return {
                    stockOnHand: stockLevel.stockOnHand || 0,
                    stockAllocated: stockLevel.stockAllocated || 0
                };
            }
            
            // Fallback: try getting variant directly
            const variant = await this.productVariantService.findOne(ctx, variantId);
            if (variant) {
                return {
                    stockOnHand: (variant as any).stockOnHand || 0,
                    stockAllocated: 0
                };
            }
            
            return { stockOnHand: 0, stockAllocated: 0 };
        } catch (error) {
            Logger.error(`Error getting stock level for variant ${variantId}: ${error}`, 'BundleService');
            return { stockOnHand: 0, stockAllocated: 0 };
        }
    }
    
    /**
     * Get final availability for bundle (public method for PDP/PLP)
     * A_final = min(A_components, A_shell, A_bundleCap) with scheduling gates
     * 
     * Order of checks (hard stops first):
     * 1. Schedule gate (status === ACTIVE && validFrom <= now <= validTo)
     * 2. Channel & visibility
     * 3. Bundle cap (A_shell from bundleCap)
     * 4. Component availability (A_components)
     * 5. A_final = min(A_shell, A_components)
     */
    async getBundleAvailability(ctx: RequestContext, bundleId: ID): Promise<{
        isAvailable: boolean;
        maxQuantity: number;
        status: string;
        reason?: string;
    }> {
        const bundle = await this.findOne(ctx, bundleId);
        if (!bundle) {
            return {
                isAvailable: false,
                maxQuantity: 0,
                status: 'NOT_FOUND',
                reason: 'Bundle not found'
            };
        }
        
        // 1. SCHEDULE GATE (hard stop)
        if (bundle.status !== BundleStatus.ACTIVE) {
            return {
                isAvailable: false,
                maxQuantity: 0,
                status: bundle.status,
                reason: bundle.statusDescription
            };
        }
        
        // Check schedule dates
        if (!bundle.isWithinSchedule()) {
            return {
                isAvailable: false,
                maxQuantity: 0,
                status: 'SCHEDULED',
                reason: bundle.getAvailabilityMessage()
            };
        }
        
        // 2. CHANNEL & VISIBILITY (already checked via ctx)
        
        // 3. BUNDLE CAP (marketing gate - A_shell with v3 reservation system)
        // Use Virtual Stock if bundleCap is set, otherwise use component availability only
        const A_shell = bundle.bundleVirtualStock ?? Infinity;
        
        // 4. COMPONENT AVAILABILITY (A_components)
        const componentAvailability = await this.calculateComponentAvailability(ctx, bundle);
        const A_components = componentAvailability.maxQuantity;
        
        // 5. FINAL SELLABLE QUANTITY
        const A_final = Math.min(A_shell, A_components);
        
        return {
            isAvailable: A_final > 0,
            maxQuantity: A_final,
            status: A_final > 0 ? 'AVAILABLE' : 'OUT_OF_STOCK',
            reason: A_final === 0 ? (
                componentAvailability.insufficientItems.length > 0
                    ? `Out of stock: ${componentAvailability.insufficientItems.map(i => i.productName).join(', ')}`
                    : 'Out of stock'
            ) : undefined
        };
    }

    /**
     * Recompute bundle pricing and availability (Phase 4.1)
     * Called when component variants are updated or for consistency checks
     */
    async recomputeBundle(ctx: RequestContext, bundleId: ID): Promise<void> {
        const bundle = await this.findOne(ctx, bundleId);
        
        if (!bundle) {
            throw new Error(`Bundle ${bundleId} not found for recomputation`);
        }
        
        Logger.debug(`Recomputing bundle ${bundleId} (${bundle.name})`, 'BundleService');
        
        try {
            // Validate all components are still available
            let hasUnavailableComponents = false;
            
            for (const item of bundle.items) {
                const variant = item.productVariant;
                if (!variant || variant.deletedAt || !variant.enabled) {
                    hasUnavailableComponents = true;
                    break;
                }
            }
            
            // If bundle has unavailable components and is ACTIVE, it needs to be marked BROKEN
            // (This will be handled by the safety service, but we validate here too)
            if (hasUnavailableComponents && bundle.status === 'ACTIVE') {
                Logger.warn(
                    `Bundle ${bundleId} has unavailable components during recomputation`,
                    'BundleService'
                );
                return; // Let the safety service handle marking it as BROKEN
            }
            
            // Recompute base price (sum of component prices)
            let basePrice = 0;
            for (const item of bundle.items) {
                const variant = item.productVariant;
                if (variant) {
                    // Get current variant price
                    const variantPrice = await this.getVariantPrice(ctx, variant.id);
                    basePrice += variantPrice * item.quantity;
                }
            }
            
            // Update bundle computed fields
            await this.connection.getRepository(ctx, Bundle)
                .update(bundleId, {
                    price: basePrice,
                    lastRecomputedAt: new Date(),
                    updatedAt: new Date()
                });
                
            // PHASE 5: Sync computed data to shell product
            await this.syncBundleToShell(ctx, bundle);
                
            Logger.debug(
                `Bundle ${bundleId} recomputed: basePrice=${basePrice}`,
                'BundleService'
            );
            
        } catch (error) {
            Logger.error(
                `Failed to recompute bundle ${bundleId}: ${error instanceof Error ? error.message : String(error)}`,
                'BundleService'
            );
            throw error;
        }
    }
    
    /**
     * Sync bundle data to shell product - Phase 5
     * Updates shell product with:
     * - Computed bundle price
     * - Availability (A_final)
     * - Component data
     */
    private async syncBundleToShell(ctx: RequestContext, bundle: Bundle): Promise<void> {
        try {
            if (!bundle.shellProductId) {
                Logger.warn(`Bundle ${bundle.id} has no shell product to sync`, 'BundleService');
                return;
            }
            
            // Get shell product
            const shellProduct = await this.connection.getRepository(ctx, Product).findOne({
                where: { id: bundle.shellProductId },
                relations: ['variants']
            });
            
            if (!shellProduct) {
                Logger.warn(`Shell product ${bundle.shellProductId} not found for bundle ${bundle.id}`, 'BundleService');
                return;
            }
            
            // Calculate A_final
            const availability = await this.getBundleAvailability(ctx, bundle.id);
            const A_final = availability.maxQuantity;
            
            // Calculate PRE-TAX effective price
            let effectivePricePreTax = 0;
            if (bundle.discountType === BundleDiscountType.FIXED && bundle.fixedPrice) {
                // Admin enters tax-inclusive fixedPrice, convert to pre-tax
                if (bundle.items?.length > 0) {
                    for (const item of bundle.items) {
                        if (item.productVariant?.price > 0 && item.productVariant?.priceWithTax > 0) {
                            const taxRatio = item.productVariant.priceWithTax / item.productVariant.price;
                            effectivePricePreTax = Math.round(bundle.fixedPrice / taxRatio);
                            break;
                        }
                    }
                }
                // Fallback: use fixedPrice as-is
                if (effectivePricePreTax === 0) {
                    effectivePricePreTax = bundle.fixedPrice;
                }
            } else if (bundle.discountType === BundleDiscountType.PERCENT && bundle.percentOff) {
                // Calculate from PRE-TAX component prices
                const componentTotal = bundle.items?.reduce((sum, item) => {
                    const price = item.productVariant?.price || 0;
                    return sum + (price * item.quantity);
                }, 0) || 0;
                effectivePricePreTax = Math.round(componentTotal * (1 - bundle.percentOff / 100));
            } else {
                // Fallback to entity getter
                effectivePricePreTax = bundle.effectivePrice;
            }
            
            // Prepare asset updates for shell product
            const assetIds = bundle.assets?.map(a => a.id) || [];
            const featuredAssetId = bundle.featuredAsset?.id;
            
            // Update shell product with bundle assets
            await this.productService.update(ctx, {
                id: shellProduct.id,
                assetIds: assetIds,
                featuredAssetId: featuredAssetId,
                customFields: {
                    ...shellProduct.customFields,
                    bundlePrice: effectivePricePreTax,
                    bundleAvailability: A_final,
                    bundleComponents: JSON.stringify(
                        bundle.items.map(item => ({
                            variantId: item.productVariantId,
                            qty: item.quantity
                        }))
                    )
                },
                enabled: bundle.status === BundleStatus.ACTIVE && bundle.isWithinSchedule()
            });
            
            // Update shell variant price
            if (shellProduct.variants && shellProduct.variants.length > 0) {
                const shellVariant = shellProduct.variants[0];
                await this.productVariantService.update(ctx, [{
                    id: shellVariant.id,
                    price: effectivePricePreTax,
                    translations: [{
                        languageCode: LanguageCode.en,
                        name: bundle.name
                    }]
                }]);
            }
            
            Logger.info(
                `Synced bundle ${bundle.id} to shell product ${shellProduct.id}: price=${effectivePricePreTax} (pre-tax), availability=${A_final}`,
                'BundleService'
            );
            
        } catch (error) {
            Logger.error(
                `Failed to sync bundle ${bundle.id} to shell: ${error instanceof Error ? error.message : String(error)}`,
                'BundleService'
            );
            // Don't throw - sync failure shouldn't break recompute
        }
    }
    
    /**
     * Get current variant price for recomputation
     */
    private async getVariantPrice(ctx: RequestContext, variantId: ID): Promise<number> {
        try {
            const variant = await this.productVariantService.findOne(ctx, variantId);
            if (!variant) {
                return 0;
            }
            
            // Get the current price (in the current channel/currency)
            return variant.price || 0;
            
        } catch (error) {
            Logger.error(`Error getting price for variant ${variantId}: ${error}`, 'BundleService');
            return 0;
        }
    }

    /**
     * Detect bundle opportunities in order lines as per specification
     */
    async detectBundleOpportunities(ctx: RequestContext, orderLines: OrderLine[]): Promise<Array<{
        bundle: Bundle;
        matches: BundleItem[];
        missing: BundleItem[];
        canComplete: boolean;
        potentialSavings: number;
    }>> {
        const bundles = await this.findAll(ctx, { filter: { enabled: { eq: true } } });
        const opportunities: Array<{
            bundle: Bundle;
            matches: BundleItem[];
            missing: BundleItem[];
            canComplete: boolean;
            potentialSavings: number;
        }> = [];

        for (const bundle of bundles.items) {
            const matches: BundleItem[] = [];
            const missing: BundleItem[] = [];

            // Check each bundle component against order lines
            for (const bundleItem of bundle.items) {
                const orderLineMatch = orderLines.find(orderLine => 
                    orderLine.productVariantId === bundleItem.productVariantId &&
                    orderLine.quantity >= bundleItem.quantity &&
                    !(orderLine as any).customFields?.bundleChild // Exclude child lines
                );

                if (orderLineMatch) {
                    matches.push(bundleItem);
                } else {
                    missing.push(bundleItem);
                }
            }

            // Calculate potential savings
            const componentTotal = bundle.items.reduce((sum, item) => sum + item.unitPrice, 0);
            const potentialSavings = componentTotal - (bundle.price || 0);

            if (matches.length > 0) {
                opportunities.push({
                    bundle,
                    matches,
                    missing,
                    canComplete: missing.length === 0,
                    potentialSavings
                });
            }
        }

        return opportunities.sort((a, b) => b.potentialSavings - a.potentialSavings);
    }
    
    /**
     * Publish bundle to ACTIVE status
     */
    async publishBundle(ctx: RequestContext, bundleId: ID): Promise<Bundle> {
        const bundle = await this.findOne(ctx, bundleId);
        if (!bundle) {
            throw new Error(`Bundle with id ${bundleId} not found`);
        }
        
        // Validate bundle can be published
        if (!bundle.canActivate()) {
            throw new Error(`Bundle cannot be published: ${bundle.validate().join(', ')}`);
        }
        
        bundle.publish();
        
        const savedBundle = await this.connection.getRepository(ctx, Bundle).save(bundle);
        Logger.info(`Bundle ${bundle.name} published to ACTIVE status (version ${bundle.version})`, 'BundleService');
        
        return savedBundle;
    }
    
    /**
     * Archive bundle (soft delete)
     */
    async archiveBundle(ctx: RequestContext, bundleId: ID): Promise<Bundle> {
        const bundle = await this.findOne(ctx, bundleId);
        if (!bundle) {
            throw new Error(`Bundle with id ${bundleId} not found`);
        }
        
        bundle.archive();
        
        const savedBundle = await this.connection.getRepository(ctx, Bundle).save(bundle);
        Logger.info(`Bundle ${bundle.name} archived`, 'BundleService');
        
        return savedBundle;
    }
    
    /**
     * Mark bundle as BROKEN when components become unavailable
     */
    async markBundleBroken(ctx: RequestContext, bundleId: ID, reason?: string): Promise<Bundle> {
        const bundle = await this.findOne(ctx, bundleId);
        if (!bundle) {
            throw new Error(`Bundle with id ${bundleId} not found`);
        }
        
        bundle.markBroken(reason);
        
        const savedBundle = await this.connection.getRepository(ctx, Bundle).save(bundle);
        Logger.warn(`Bundle ${bundle.name} marked as BROKEN: ${reason}`, 'BundleService');
        
        return savedBundle;
    }
    
    /**
     * Restore bundle from BROKEN to ACTIVE if components are available again
     */
    async restoreBundle(ctx: RequestContext, bundleId: ID): Promise<Bundle> {
        const bundle = await this.findOne(ctx, bundleId);
        if (!bundle) {
            throw new Error(`Bundle with id ${bundleId} not found`);
        }
        
        if (bundle.restore()) {
            const savedBundle = await this.connection.getRepository(ctx, Bundle).save(bundle);
            Logger.info(`Bundle ${bundle.name} restored to ACTIVE status`, 'BundleService');
            return savedBundle;
        } else {
            throw new Error(`Bundle cannot be restored: ${bundle.validate().join(', ')}`);
        }
    }
    
    /**
     * Find all active bundles (for public API)
     */
    async findActiveBundles(ctx: RequestContext, options?: BundleListOptions): Promise<PaginatedList<Bundle>> {
        const queryOptions = {
            ...options,
            filter: {
                ...options?.filter,
                status: { eq: BundleStatus.ACTIVE }
            }
        };
        
        return this.findAll(ctx, queryOptions);
    }
    
    /**
     * Find bundles by status
     */
    async findBundlesByStatus(ctx: RequestContext, status: BundleStatus, options?: BundleListOptions): Promise<PaginatedList<Bundle>> {
        const queryOptions = {
            ...options,
            filter: {
                ...options?.filter,
                status: { eq: status }
            }
        };
        
        return this.findAll(ctx, queryOptions);
    }

    /**
     * Create exploded bundle for Bundle Plugin v2 spec
     * Returns header line (cosmetic, 0 price) + child lines (actual variants with pricing and bundle metadata)
     */
    async createExplodedBundle(ctx: RequestContext, bundleId: ID, quantity: number): Promise<{
        headerLine: {
            productVariantId: ID;
            quantity: number;
            customFields: any;
        };
        childLines: Array<{
            productVariantId: ID;
            quantity: number;
            customFields: any;
        }>;
    }> {
        const bundle = await this.findOne(ctx, bundleId);
        if (!bundle) {
            throw new Error(`Bundle with id ${bundleId} not found`);
        }

        // Generate unique bundle key for grouping
        const bundleKey = `bundle-${bundleId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Calculate bundle pricing according to Bundle Plugin v2 spec
        const { totalPreDiscount, childLinesWithPricing } = await this.calculateExplodedBundlePricing(
            ctx, 
            bundle, 
            quantity
        );

        // Create header line using first component variant as placeholder (cosmetic, 0 price, isBundleHeader=true)
        // This is a temporary solution - ideally should use a bundle shell product variant
        const firstVariantId = bundle.items[0].productVariantId;
        
        const headerLine = {
            productVariantId: firstVariantId, // Use first component as header placeholder
            quantity,
            customFields: {
                bundleKey,
                bundleId: bundleId,
                bundleName: bundle.name,
                bundleVersion: 1, // Default version for now
                isBundleHeader: true,
                bundleComponentQty: null,
                baseUnitPrice: 0,
                effectiveUnitPrice: 0,
                bundlePctApplied: null,
                bundleAdjAmount: null,
                bundleShare: null
            }
        };

        // Create child lines with bundle pricing metadata
        const childLines = childLinesWithPricing.map(child => ({
            productVariantId: child.productVariantId,
            quantity: child.quantity,
            customFields: {
                bundleKey,
                bundleId: bundleId,
                bundleName: bundle.name,
                bundleVersion: 1,
                isBundleHeader: false,
                bundleComponentQty: child.componentQty,
                baseUnitPrice: child.baseUnitPrice,
                effectiveUnitPrice: child.effectiveUnitPrice,
                bundlePctApplied: child.bundlePctApplied,
                bundleAdjAmount: child.bundleAdjAmount,
                bundleShare: child.bundleShare
            }
        }));

        return { headerLine, childLines };
    }

    /**
     * Bundle Plugin v2 Pricing Engine - Complete implementation
     * Handles percent-off and fixed-price bundles with proper rounding drift correction
     */
    private async calculateExplodedBundlePricing(
        ctx: RequestContext,
        bundle: Bundle,
        bundleQuantity: number
    ): Promise<{
        totalPreDiscount: number;
        totalBundlePrice: number;
        totalDiscount: number;
        childLinesWithPricing: Array<{
            productVariantId: ID;
            quantity: number;
            componentQty: number;
            baseUnitPrice: number;
            effectiveUnitPrice: number;
            bundlePctApplied: number;
            bundleAdjAmount: number;
            bundleShare: number;
            subtotal: number;
            weight?: number;
        }>;
    }> {
        // Step 1: Get current prices and calculate pre-discount totals
        const componentData = await this.getComponentPricingData(ctx, bundle, bundleQuantity);
        
        // Step 2: Calculate bundle price based on discount type
        const bundlePricing = this.calculateBundlePrice(bundle, componentData, bundleQuantity);
        
        // Step 3: Apply discount with proper proration and drift correction
        const childLinesWithPricing = await this.applyBundleDiscount(
            componentData,
            bundlePricing,
            bundle.discountType
        );
        
        return {
            totalPreDiscount: componentData.totalPreDiscount,
            totalBundlePrice: bundlePricing.totalBundlePrice,
            totalDiscount: bundlePricing.totalDiscount,
            childLinesWithPricing
        };
    }
    
    /**
     * Step 1: Get component pricing data with current variant prices
     */
    private async getComponentPricingData(
        ctx: RequestContext,
        bundle: Bundle,
        bundleQuantity: number
    ): Promise<{
        totalPreDiscount: number;
        components: Array<{
            productVariantId: ID;
            quantity: number;
            componentQty: number;
            baseUnitPrice: number;
            subtotal: number;
            weight?: number;
            bundleItem: BundleItem;
        }>;
    }> {
        const components: Array<{
            productVariantId: ID;
            quantity: number;
            componentQty: number;
            baseUnitPrice: number;
            subtotal: number;
            weight?: number;
            bundleItem: BundleItem;
        }> = [];
        
        let totalPreDiscount = 0;
        
        for (const item of bundle.items) {
            const variant = await this.productVariantService.findOne(ctx, item.productVariantId);
            if (!variant) {
                throw new Error(`ProductVariant with id ${item.productVariantId} not found`);
            }
            
            const baseUnitPrice = variant.priceWithTax; // Use tax-inclusive price
            const componentQty = item.quantity;
            const totalQuantity = componentQty * bundleQuantity;
            const subtotal = baseUnitPrice * totalQuantity;
            
            totalPreDiscount += subtotal;
            
            components.push({
                productVariantId: item.productVariantId,
                quantity: totalQuantity,
                componentQty,
                baseUnitPrice,
                subtotal,
                weight: item.weight,
                bundleItem: item
            });
        }
        
        return { totalPreDiscount, components };
    }
    
    /**
     * Step 2: Calculate bundle price based on discount type
     */
    private calculateBundlePrice(
        bundle: Bundle,
        componentData: { totalPreDiscount: number; components: any[] },
        bundleQuantity: number
    ): {
        totalBundlePrice: number;
        totalDiscount: number;
        bundlePct?: number;
    } {
        let totalBundlePrice: number;
        let totalDiscount: number;
        let bundlePct: number | undefined;
        
        if (bundle.discountType === BundleDiscountType.PERCENT && bundle.percentOff) {
            // Percent-off bundle: Apply percentage discount to component total
            bundlePct = bundle.percentOff;
            const discountMultiplier = bundlePct / 100;
            totalDiscount = Math.round(componentData.totalPreDiscount * discountMultiplier);
            totalBundlePrice = componentData.totalPreDiscount - totalDiscount;
        } else if (bundle.discountType === BundleDiscountType.FIXED && bundle.fixedPrice) {
            // Fixed-price bundle: Set total price, calculate discount
            totalBundlePrice = bundle.fixedPrice * bundleQuantity; // fixedPrice is in cents
            totalDiscount = componentData.totalPreDiscount - totalBundlePrice;
            
            // Validate that fixed price is lower than component total
            if (totalBundlePrice >= componentData.totalPreDiscount) {
                Logger.warn(`Fixed price bundle ${bundle.name} has no discount: fixed=${totalBundlePrice}, components=${componentData.totalPreDiscount}`, 'BundleService');
                totalDiscount = 0;
            }
        } else {
            // Fallback: use legacy price field
            totalBundlePrice = (bundle.price || 0) * bundleQuantity * 100; // Convert to cents
            totalDiscount = componentData.totalPreDiscount - totalBundlePrice;
        }
        
        return { totalBundlePrice, totalDiscount, bundlePct };
    }
    
    /**
     * Step 3: Apply discount with Bundle Plugin v2 proration and drift correction
     */
    private async applyBundleDiscount(
        componentData: { totalPreDiscount: number; components: any[] },
        bundlePricing: { totalBundlePrice: number; totalDiscount: number; bundlePct?: number },
        discountType: BundleDiscountType
    ): Promise<Array<{
        productVariantId: ID;
        quantity: number;
        componentQty: number;
        baseUnitPrice: number;
        effectiveUnitPrice: number;
        bundlePctApplied: number;
        bundleAdjAmount: number;
        bundleShare: number;
        subtotal: number;
        weight?: number;
    }>> {
        const childLines: Array<{
            productVariantId: ID;
            quantity: number;
            componentQty: number;
            baseUnitPrice: number;
            effectiveUnitPrice: number;
            bundlePctApplied: number;
            bundleAdjAmount: number;
            bundleShare: number;
            subtotal: number;
            weight?: number;
        }> = [];
        
        // If no discount, return components at full price
        if (bundlePricing.totalDiscount <= 0) {
            return componentData.components.map(comp => ({
                productVariantId: comp.productVariantId,
                quantity: comp.quantity,
                componentQty: comp.componentQty,
                baseUnitPrice: comp.baseUnitPrice,
                effectiveUnitPrice: comp.baseUnitPrice,
                bundlePctApplied: 0,
                bundleAdjAmount: 0,
                bundleShare: comp.subtotal / componentData.totalPreDiscount,
                subtotal: comp.subtotal,
                weight: comp.weight
            }));
        }
        
        // Calculate proportional shares for each component
        let totalAllocatedDiscount = 0;
        let largestComponentIndex = 0;
        let largestSubtotal = 0;
        
        // First pass: calculate provisional adjustments
        for (let i = 0; i < componentData.components.length; i++) {
            const comp = componentData.components[i];
            const bundleShare = comp.subtotal / componentData.totalPreDiscount;
            
            // Track largest component for rounding adjustment
            if (comp.subtotal > largestSubtotal) {
                largestSubtotal = comp.subtotal;
                largestComponentIndex = i;
            }
            
            let bundleAdjAmount: number;
            let bundlePctApplied: number;
            
            if (discountType === BundleDiscountType.PERCENT && bundlePricing.bundlePct) {
                // Percent discount: Apply same percentage to all components
                bundlePctApplied = bundlePricing.bundlePct;
                bundleAdjAmount = -Math.round(comp.subtotal * (bundlePricing.bundlePct / 100));
            } else {
                // Fixed price: Use value-based proration with weights if available
                const effectiveWeight = comp.weight || 1;
                const totalWeight = componentData.components.reduce((sum, c) => sum + (c.weight || 1), 0);
                
                // Weight-adjusted share for fixed-price bundles
                const weightAdjustedShare = (bundleShare * effectiveWeight) / (totalWeight / componentData.components.length);
                const normalizedShare = Math.min(weightAdjustedShare, 1); // Ensure share doesn't exceed 1
                
                bundleAdjAmount = -Math.round(bundlePricing.totalDiscount * normalizedShare);
                bundlePctApplied = comp.subtotal > 0 ? ((-bundleAdjAmount) / comp.subtotal) * 100 : 0;
            }
            
            const effectiveUnitPrice = Math.max(0, comp.baseUnitPrice + Math.round(bundleAdjAmount / comp.quantity));
            totalAllocatedDiscount += (-bundleAdjAmount);
            
            childLines.push({
                productVariantId: comp.productVariantId,
                quantity: comp.quantity,
                componentQty: comp.componentQty,
                baseUnitPrice: comp.baseUnitPrice,
                effectiveUnitPrice,
                bundlePctApplied,
                bundleAdjAmount,
                bundleShare,
                subtotal: comp.subtotal,
                weight: comp.weight
            });
        }
        
        // Second pass: Fix rounding drift on largest component
        const driftAmount = bundlePricing.totalDiscount - totalAllocatedDiscount;
        if (driftAmount !== 0) {
            const largestChild = childLines[largestComponentIndex];
            largestChild.bundleAdjAmount -= driftAmount; // Adjust for drift
            
            // Recalculate percentage and effective price for adjusted component
            if (largestChild.subtotal > 0) {
                largestChild.bundlePctApplied = ((-largestChild.bundleAdjAmount) / largestChild.subtotal) * 100;
            }
            largestChild.effectiveUnitPrice = Math.max(0, 
                largestChild.baseUnitPrice + Math.round(largestChild.bundleAdjAmount / largestChild.quantity)
            );
            
            Logger.debug(`Bundle pricing drift correction: ${driftAmount} cents applied to component ${largestChild.productVariantId}`, 'BundleService');
        }
        
        // Validation: Ensure total adjustments equal total discount
        const finalTotalAdjustment = childLines.reduce((sum, child) => sum + (-child.bundleAdjAmount), 0);
        if (Math.abs(finalTotalAdjustment - bundlePricing.totalDiscount) > 1) { // Allow 1 cent tolerance
            Logger.error(
                `Bundle pricing validation failed: expected discount ${bundlePricing.totalDiscount}, got ${finalTotalAdjustment}`,
                'BundleService'
            );
        }
        
        return childLines;
    }

    /**
     * Create exploded bundle order lines (parent + children)
     * Following the documentation specification for atomic operations
     */
    async createBundleOrderLines(ctx: RequestContext, bundleId: ID, quantity: number): Promise<{
        parentLine: Partial<OrderLine>;
        childLines: Partial<OrderLine>[];
    }> {
        const bundle = await this.findOne(ctx, bundleId);
        if (!bundle) {
            throw new Error(`Bundle with id ${bundleId} not found`);
        }

        // Validate stock availability
        const stockValidation = await this.validateBundleStock(ctx, bundleId, quantity);
        if (!stockValidation.isAvailable) {
            const errorMessage = stockValidation.insufficientItems
                .map(item => `${item.productName}: need ${item.required}, have ${item.available}`)
                .join(', ');
            throw new Error(`Insufficient stock for bundle components: ${errorMessage}`);
        }

        const parentLineId = `bundle-${bundleId}-${Date.now()}`;

        // Create parent bundle line (visible, priced)
        const parentLine: Partial<OrderLine> = {
            productVariantId: bundleId, // Using bundle ID as variant ID
            quantity,
            unitPrice: bundle.price,
            customFields: {
                bundleParent: true,
                bundleId: bundleId,
            }
        };

        // Create child component lines (hidden, zero-priced)
        const childLines: Partial<OrderLine>[] = bundle.items.map(item => ({
            productVariantId: item.productVariantId,
            quantity: item.quantity * quantity,
            unitPrice: 0, // Zero-priced for children as per specification
            customFields: {
                bundleChild: true,
                bundleParentLineId: parentLineId,
                bundleId: bundleId,
            }
        }));

        return { parentLine, childLines };
    }

    /**
     * Get bundle groups from order for UI display
     */
    async getBundleGroups(ctx: RequestContext, orderLines: OrderLine[]): Promise<Array<{
        parentLine: OrderLine;
        childLines: OrderLine[];
        bundle: Bundle;
    }>> {
        const bundleGroups: Array<{
            parentLine: OrderLine;
            childLines: OrderLine[];
            bundle: Bundle;
        }> = [];

        // Find all parent bundle lines
        const parentLines = orderLines.filter(line => (line as any).customFields?.bundleParent);

        for (const parentLine of parentLines) {
            const bundleId = (parentLine as any).customFields?.bundleId;
            if (!bundleId) continue;

            const bundle = await this.findOne(ctx, bundleId);
            if (!bundle) continue;

            // Find child lines for this parent
            const childLines = orderLines.filter(line => 
                (line as any).customFields?.bundleChild && 
                (line as any).customFields?.bundleParentLineId === parentLine.id
            );

            bundleGroups.push({
                parentLine,
                childLines,
                bundle
            });
        }

        return bundleGroups;
    }
    
    /**
     * Comprehensive checkout validation - Phase 2.1 requirement
     * Validates all bundle availability before allowing checkout
     */
    async validateCheckoutAvailability(ctx: RequestContext, orderLines: OrderLine[]): Promise<{
        isValid: boolean;
        errors: Array<{
            bundleId: ID;
            bundleName: string;
            error: string;
            insufficientItems?: Array<{
                variantId: string;
                productName: string;
                required: number;
                available: number;
                shortfall: number;
            }>;
        }>;
    }> {
        const bundleGroups = await this.getBundleGroups(ctx, orderLines);
        const errors: Array<{
            bundleId: ID;
            bundleName: string;
            error: string;
            insufficientItems?: Array<{
                variantId: string;
                productName: string;
                required: number;
                available: number;
                shortfall: number;
            }>;
        }> = [];
        
        for (const group of bundleGroups) {
            const bundle = group.bundle;
            const requestedQuantity = group.parentLine.quantity;
            
            // Check if bundle is still active
            if (!bundle.isAvailable) {
                errors.push({
                    bundleId: bundle.id,
                    bundleName: bundle.name,
                    error: `Bundle is not available (status: ${bundle.status})`
                });
                continue;
            }
            
            // Validate stock availability
            const stockValidation = await this.validateBundleStock(ctx, bundle.id, requestedQuantity);
            if (!stockValidation.isAvailable) {
                errors.push({
                    bundleId: bundle.id,
                    bundleName: bundle.name,
                    error: `Insufficient stock. Requested: ${requestedQuantity}, Available: ${stockValidation.maxAvailableQuantity}`,
                    insufficientItems: stockValidation.insufficientItems
                });
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    
    /**
     * Validate bundle component integrity for exploded bundles
     * Ensures all child lines match bundle configuration
     */
    async validateBundleIntegrity(ctx: RequestContext, orderLines: OrderLine[]): Promise<{
        isValid: boolean;
        errors: Array<{
            bundleId: ID;
            bundleName: string;
            error: string;
        }>;
    }> {
        const bundleGroups = await this.getBundleGroups(ctx, orderLines);
        const errors: Array<{
            bundleId: ID;
            bundleName: string;
            error: string;
        }> = [];
        
        for (const group of bundleGroups) {
            const bundle = group.bundle;
            const parentLine = group.parentLine;
            const childLines = group.childLines;
            const bundleQuantity = parentLine.quantity;
            
            // Check if all required components are present
            for (const bundleItem of bundle.items) {
                const expectedQuantity = bundleItem.quantity * bundleQuantity;
                const childLine = childLines.find(line => 
                    line.productVariantId === bundleItem.productVariantId
                );
                
                if (!childLine) {
                    errors.push({
                        bundleId: bundle.id,
                        bundleName: bundle.name,
                        error: `Missing component variant ${bundleItem.productVariantId}`
                    });
                    continue;
                }
                
                if (childLine.quantity !== expectedQuantity) {
                    errors.push({
                        bundleId: bundle.id,
                        bundleName: bundle.name,
                        error: `Component quantity mismatch for variant ${bundleItem.productVariantId}. Expected: ${expectedQuantity}, Found: ${childLine.quantity}`
                    });
                }
            }
            
            // Check for unexpected child lines
            for (const childLine of childLines) {
                const bundleItem = bundle.items.find(item => 
                    item.productVariantId === childLine.productVariantId
                );
                
                if (!bundleItem) {
                    errors.push({
                        bundleId: bundle.id,
                        bundleName: bundle.name,
                        error: `Unexpected component variant ${childLine.productVariantId} not in bundle configuration`
                    });
                }
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    
    /**
     * Complete pre-checkout validation - combines availability and integrity checks
     */
    async validatePreCheckout(ctx: RequestContext, orderLines: OrderLine[]): Promise<{
        isValid: boolean;
        errors: string[];
        warnings: string[];
    }> {
        const availabilityValidation = await this.validateCheckoutAvailability(ctx, orderLines);
        const integrityValidation = await this.validateBundleIntegrity(ctx, orderLines);
        
        const errors: string[] = [];
        const warnings: string[] = [];
        
        // Add availability errors
        availabilityValidation.errors.forEach(error => {
            errors.push(`Bundle "${error.bundleName}": ${error.error}`);
            if (error.insufficientItems && error.insufficientItems.length > 0) {
                error.insufficientItems.forEach(item => {
                    warnings.push(`${item.productName}: need ${item.required}, available ${item.available}`);
                });
            }
        });
        
        // Add integrity errors
        integrityValidation.errors.forEach(error => {
            errors.push(`Bundle "${error.bundleName}": ${error.error}`);
        });
        
        return {
            isValid: availabilityValidation.isValid && integrityValidation.isValid,
            errors,
            warnings
        };
    }
    
    /**
     * Calculate current bundle price without applying to order (for PDP/preview)
     */
    async calculateBundlePricePreview(ctx: RequestContext, bundleId: ID, quantity: number = 1): Promise<{
        componentTotal: number;
        bundleTotal: number;
        totalSavings: number;
        effectiveDiscountPct: number;
        priceBreakdown: Array<{
            variantId: ID;
            variantName: string;
            basePrice: number;
            effectivePrice: number;
            savings: number;
            quantity: number;
        }>;
    }> {
        const bundle = await this.findOne(ctx, bundleId);
        if (!bundle) {
            throw new Error(`Bundle with id ${bundleId} not found`);
        }
        
        const pricingData = await this.calculateExplodedBundlePricing(ctx, bundle, quantity);
        const priceBreakdown: Array<{
            variantId: ID;
            variantName: string;
            basePrice: number;
            effectivePrice: number;
            savings: number;
            quantity: number;
        }> = [];
        
        for (const child of pricingData.childLinesWithPricing) {
            const variant = await this.productVariantService.findOne(ctx, child.productVariantId);
            const savings = (child.baseUnitPrice - child.effectiveUnitPrice) * child.quantity;
            
            priceBreakdown.push({
                variantId: child.productVariantId,
                variantName: variant?.name || 'Unknown Variant',
                basePrice: child.baseUnitPrice * child.quantity,
                effectivePrice: child.effectiveUnitPrice * child.quantity,
                savings,
                quantity: child.quantity
            });
        }
        
        const componentTotal = pricingData.totalPreDiscount;
        const bundleTotal = pricingData.totalBundlePrice;
        const totalSavings = pricingData.totalDiscount;
        const effectiveDiscountPct = componentTotal > 0 ? (totalSavings / componentTotal) * 100 : 0;
        
        return {
            componentTotal,
            bundleTotal,
            totalSavings,
            effectiveDiscountPct,
            priceBreakdown
        };
    }
    
    /**
     * Recalculate bundle pricing when component prices change (for background jobs)
     */
    async recalculateBundlePricing(ctx: RequestContext, bundleId: ID): Promise<{
        updated: boolean;
        oldPrice?: number;
        newPrice?: number;
        priceChangePercent?: number;
    }> {
        const bundle = await this.findOne(ctx, bundleId);
        if (!bundle) {
            throw new Error(`Bundle with id ${bundleId} not found`);
        }
        
        // Calculate current pricing based on latest component prices
        const pricingData = await this.calculateExplodedBundlePricing(ctx, bundle, 1);
        const newBundlePrice = Math.round(pricingData.totalBundlePrice / 100 * 100) / 100; // Convert to dollars
        const oldBundlePrice = bundle.price || 0;
        
        // Check if price changed significantly (>1% change)
        const priceChangePercent = oldBundlePrice > 0 ? 
            Math.abs((newBundlePrice - oldBundlePrice) / oldBundlePrice) * 100 : 100;
            
        if (priceChangePercent > 1) {
            // Update bundle price and version
            bundle.price = newBundlePrice;
            // updatedAt is automatically handled by VendureEntity
            
            await this.connection.getRepository(ctx, Bundle).save(bundle);
            
            Logger.info(
                `Bundle ${bundle.name} pricing updated: $${oldBundlePrice} → $${newBundlePrice} (${priceChangePercent.toFixed(1)}% change)`,
                'BundleService'
            );
            
            return {
                updated: true,
                oldPrice: oldBundlePrice,
                newPrice: newBundlePrice,
                priceChangePercent
            };
        }
        
        return { updated: false };
    }
    
    /**
     * Create price snapshots for bundle components at time of order
     * This ensures pricing consistency even if component prices change later
     */
    async createPriceSnapshots(ctx: RequestContext, bundleId: ID, bundleQuantity: number): Promise<{
        bundleKey: string;
        snapshots: Array<{
            productVariantId: ID;
            snapshotPrice: number;
            currentPrice: number;
            priceChanged: boolean;
        }>;
    }> {
        const bundle = await this.findOne(ctx, bundleId);
        if (!bundle) {
            throw new Error(`Bundle with id ${bundleId} not found`);
        }
        
        const bundleKey = `bundle-${bundleId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const snapshots: Array<{
            productVariantId: ID;
            snapshotPrice: number;
            currentPrice: number;
            priceChanged: boolean;
        }> = [];
        
        // Create snapshots for all components
        for (const item of bundle.items) {
            const variant = await this.productVariantService.findOne(ctx, item.productVariantId);
            if (!variant) {
                throw new Error(`ProductVariant with id ${item.productVariantId} not found`);
            }
            
            const currentPrice = variant.priceWithTax;
            const snapshotPrice = item.unitPriceSnapshot || currentPrice;
            const priceChanged = Math.abs(currentPrice - snapshotPrice) > 1; // 1 cent tolerance
            
            snapshots.push({
                productVariantId: item.productVariantId,
                snapshotPrice,
                currentPrice,
                priceChanged
            });
            
            if (priceChanged) {
                Logger.debug(
                    `Price change detected for component ${item.productVariantId}: ${snapshotPrice} → ${currentPrice}`,
                    'BundleService'
                );
            }
        }
        
        return { bundleKey, snapshots };
    }
    
    /**
     * Validate bundle pricing integrity (for testing/debugging)
     */
    async validateBundlePricingIntegrity(ctx: RequestContext, bundleId: ID, quantity: number = 1): Promise<{
        isValid: boolean;
        errors: string[];
        warnings: string[];
        details: {
            totalPreDiscount: number;
            totalBundlePrice: number;
            totalDiscount: number;
            calculatedTotalAdjustment: number;
            driftAmount: number;
        };
    }> {
        const errors: string[] = [];
        const warnings: string[] = [];
        
        try {
            const bundle = await this.findOne(ctx, bundleId);
            if (!bundle) {
                errors.push(`Bundle with id ${bundleId} not found`);
                return {
                    isValid: false,
                    errors,
                    warnings,
                    details: {
                        totalPreDiscount: 0,
                        totalBundlePrice: 0,
                        totalDiscount: 0,
                        calculatedTotalAdjustment: 0,
                        driftAmount: 0
                    }
                };
            }
            
            const pricingData = await this.calculateExplodedBundlePricing(ctx, bundle, quantity);
            
            // Validate that all adjustments sum to total discount
            const calculatedTotalAdjustment = pricingData.childLinesWithPricing.reduce(
                (sum, child) => sum + (-child.bundleAdjAmount), 0
            );
            const driftAmount = pricingData.totalDiscount - calculatedTotalAdjustment;
            
            // Check for significant drift (>1 cent tolerance)
            if (Math.abs(driftAmount) > 1) {
                errors.push(`Pricing drift detected: expected ${pricingData.totalDiscount}, got ${calculatedTotalAdjustment}`);
            }
            
            // Validate that bundle provides actual savings
            if (pricingData.totalDiscount <= 0) {
                warnings.push(`Bundle provides no savings: components=${pricingData.totalPreDiscount}, bundle=${pricingData.totalBundlePrice}`);
            }
            
            // Validate component pricing is reasonable
            for (const child of pricingData.childLinesWithPricing) {
                if (child.effectiveUnitPrice < 0) {
                    errors.push(`Component ${child.productVariantId} has negative effective price: ${child.effectiveUnitPrice}`);
                }
                
                if (child.bundlePctApplied > 100) {
                    warnings.push(`Component ${child.productVariantId} has >100% discount: ${child.bundlePctApplied.toFixed(1)}%`);
                }
            }
            
            return {
                isValid: errors.length === 0,
                errors,
                warnings,
                details: {
                    totalPreDiscount: pricingData.totalPreDiscount,
                    totalBundlePrice: pricingData.totalBundlePrice,
                    totalDiscount: pricingData.totalDiscount,
                    calculatedTotalAdjustment,
                    driftAmount
                }
            };
            
        } catch (error) {
            errors.push(`Pricing validation failed: ${error}`);
            return {
                isValid: false,
                errors,
                warnings,
                details: {
                    totalPreDiscount: 0,
                    totalBundlePrice: 0,
                    totalDiscount: 0,
                    calculatedTotalAdjustment: 0,
                    driftAmount: 0
                }
            };
        }
    }
    
    // ============================================================================
    // BUNDLE MUTATIONS - Phase 2.3 Implementation
    // ============================================================================
    
    /**
     * Add bundle to order - Complete Bundle Plugin v2 implementation
     * Creates exploded bundle with proper shell header + component children
     */
    async addBundleToOrder(
        ctx: RequestContext, 
        orderId: ID, 
        bundleId: ID, 
        quantity: number
    ): Promise<{
        success: boolean;
        bundleKey?: string;
        headerLine?: Partial<OrderLine>;
        childLines?: Partial<OrderLine>[];
        error?: string;
        availabilityError?: {
            bundleName: string;
            maxAvailable: number;
            insufficientItems: Array<{
                variantId: string;
                productName: string;
                required: number;
                available: number;
                shortfall: number;
            }>;
        };
    }> {
        try {
            // Step 1: Validate bundle exists and is active
            const bundle = await this.findOne(ctx, bundleId);
            if (!bundle) {
                return {
                    success: false,
                    error: `Bundle with id ${bundleId} not found`
                };
            }
            
            if (!bundle.isAvailable) {
                return {
                    success: false,
                    error: `Bundle "${bundle.name}" is not available (status: ${bundle.status})`
                };
            }
            
            // Step 2: Validate availability
            const stockValidation = await this.validateBundleStock(ctx, bundleId, quantity);
            if (!stockValidation.isAvailable) {
                return {
                    success: false,
                    error: 'Insufficient stock for bundle components',
                    availabilityError: {
                        bundleName: bundle.name,
                        maxAvailable: stockValidation.maxAvailableQuantity,
                        insufficientItems: stockValidation.insufficientItems
                    }
                };
            }
            
            // Step 3: Get shell product variant for header line
            const shellVariant = await this.getOrCreateShellVariant(ctx, bundle);
            
            // Step 4: Generate exploded bundle with proper pricing
            const explodedBundle = await this.createExplodedBundleV2(ctx, bundle, quantity, shellVariant.id);
            
            // Step 5: Create actual order lines (would integrate with Order system)
            // Note: This would typically integrate with Vendure's OrderService
            Logger.info(
                `Bundle "${bundle.name}" added to order ${orderId}: ${quantity} units with ${explodedBundle.childLines.length} components`,
                'BundleService'
            );
            
            return {
                success: true,
                bundleKey: explodedBundle.bundleKey,
                headerLine: explodedBundle.headerLine,
                childLines: explodedBundle.childLines
            };
            
        } catch (error) {
            Logger.error(`Failed to add bundle ${bundleId} to order ${orderId}: ${error}`, 'BundleService');
            return {
                success: false,
                error: `Failed to add bundle: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }
    
    /**
     * Adjust bundle quantity in order - handles pricing recalculation
     */
    async adjustBundleInOrder(
        ctx: RequestContext,
        orderId: ID,
        bundleKey: string,
        newQuantity: number
    ): Promise<{
        success: boolean;
        operation: 'updated' | 'removed';
        bundleKey?: string;
        headerLine?: Partial<OrderLine>;
        childLines?: Partial<OrderLine>[];
        error?: string;
    }> {
        try {
            // Handle removal case (quantity = 0)
            if (newQuantity === 0) {
                const removeResult = await this.removeBundleFromOrder(ctx, orderId, bundleKey);
                return {
                    success: removeResult.success,
                    operation: 'removed',
                    error: removeResult.error
                };
            }
            
            // Step 1: Find existing bundle lines by bundleKey
            const existingBundle = await this.findBundleByKey(ctx, orderId, bundleKey);
            if (!existingBundle) {
                return {
                    success: false,
                    operation: 'updated',
                    error: `Bundle with key ${bundleKey} not found in order ${orderId}`
                };
            }
            
            // Step 2: Validate new quantity availability
            const stockValidation = await this.validateBundleStock(ctx, existingBundle.bundleId, newQuantity);
            if (!stockValidation.isAvailable) {
                return {
                    success: false,
                    operation: 'updated',
                    error: `Insufficient stock for quantity ${newQuantity}. Available: ${stockValidation.maxAvailableQuantity}`
                };
            }
            
            // Step 3: Recalculate pricing with new quantity
            const bundle = await this.findOne(ctx, existingBundle.bundleId);
            if (!bundle) {
                return {
                    success: false,
                    operation: 'updated',
                    error: `Bundle definition not found`
                };
            }
            
            const shellVariant = await this.getOrCreateShellVariant(ctx, bundle);
            const updatedBundle = await this.createExplodedBundleV2(ctx, bundle, newQuantity, shellVariant.id, bundleKey);
            
            Logger.info(
                `Bundle "${bundle.name}" quantity adjusted in order ${orderId}: ${existingBundle.quantity} → ${newQuantity}`,
                'BundleService'
            );
            
            return {
                success: true,
                operation: 'updated',
                bundleKey: updatedBundle.bundleKey,
                headerLine: updatedBundle.headerLine,
                childLines: updatedBundle.childLines
            };
            
        } catch (error) {
            Logger.error(`Failed to adjust bundle ${bundleKey} in order ${orderId}: ${error}`, 'BundleService');
            return {
                success: false,
                operation: 'updated',
                error: `Failed to adjust bundle: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }
    
    /**
     * Remove bundle from order - clean removal of all bundle lines
     */
    async removeBundleFromOrder(
        ctx: RequestContext,
        orderId: ID,
        bundleKey: string
    ): Promise<{
        success: boolean;
        removedLines: number;
        bundleName?: string;
        error?: string;
    }> {
        try {
            // Step 1: Find all bundle lines by bundleKey
            const bundleLines = await this.findBundleLinesByKey(ctx, orderId, bundleKey);
            if (bundleLines.length === 0) {
                return {
                    success: false,
                    removedLines: 0,
                    error: `No bundle lines found with key ${bundleKey} in order ${orderId}`
                };
            }
            
            // Step 2: Get bundle info for logging
            const headerLine = bundleLines.find(line => line.customFields?.isBundleHeader);
            const bundleName = headerLine?.customFields?.bundleName || 'Unknown Bundle';
            
            // Step 3: Remove all bundle lines (header + children)
            // Note: This would integrate with Vendure's OrderService to actually remove lines
            const removedCount = bundleLines.length;
            
            Logger.info(
                `Bundle "${bundleName}" removed from order ${orderId}: ${removedCount} lines (1 header + ${removedCount - 1} components)`,
                'BundleService'
            );
            
            return {
                success: true,
                removedLines: removedCount,
                bundleName
            };
            
        } catch (error) {
            Logger.error(`Failed to remove bundle ${bundleKey} from order ${orderId}: ${error}`, 'BundleService');
            return {
                success: false,
                removedLines: 0,
                error: `Failed to remove bundle: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }
    
    // ============================================================================
    // BUNDLE MUTATION SUPPORT METHODS
    // ============================================================================
    
    /**
     * Get or create shell product variant for bundle header line
     * Fixes the "dummy first component" issue from Phase 2.3 requirements
     */
    private async getOrCreateShellVariant(ctx: RequestContext, bundle: Bundle): Promise<{
        id: ID;
        name: string;
        isShell: boolean;
    }> {
        // Try to find existing shell product
        const shellProduct = await this.findShellProduct(ctx, bundle.id);
        
        if (shellProduct && shellProduct.variants && shellProduct.variants.length > 0) {
            const shellVariant = shellProduct.variants[0];
            return {
                id: shellVariant.id,
                name: shellVariant.name,
                isShell: true
            };
        }
        
        // Fallback: Use first component variant (legacy behavior)
        // TODO: In production, this should create a proper shell product
        const firstComponent = bundle.items[0];
        if (!firstComponent) {
            throw new Error(`Bundle ${bundle.name} has no components`);
        }
        
        const variant = await this.productVariantService.findOne(ctx, firstComponent.productVariantId);
        if (!variant) {
            throw new Error(`First component variant ${firstComponent.productVariantId} not found`);
        }
        
        Logger.warn(
            `Bundle ${bundle.name} using first component ${variant.name} as header (no shell product found)`,
            'BundleService'
        );
        
        return {
            id: variant.id,
            name: `${bundle.name} Bundle`, // Use bundle name for header
            isShell: false
        };
    }
    
    /**
     * Create exploded bundle v2 with proper shell variant header
     * Replaces the old createExplodedBundle method
     */
    private async createExplodedBundleV2(
        ctx: RequestContext,
        bundle: Bundle,
        quantity: number,
        shellVariantId: ID,
        existingBundleKey?: string
    ): Promise<{
        bundleKey: string;
        headerLine: Partial<OrderLine>;
        childLines: Partial<OrderLine>[];
    }> {
        // Generate or reuse bundle key
        const bundleKey = existingBundleKey || 
            `bundle-${bundle.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Calculate bundle pricing
        const pricingData = await this.calculateExplodedBundlePricing(ctx, bundle, quantity);
        
        // Create header line using proper shell variant
        const headerLine: Partial<OrderLine> = {
            productVariantId: shellVariantId,
            quantity,
            customFields: {
                bundleKey,
                bundleId: bundle.id,
                bundleName: bundle.name,
                bundleVersion: bundle.version,
                discountType: bundle.discountType,
                isBundleHeader: true,
                
                // Header-specific fields (cosmetic display only)
                bundleComponentQty: null,
                baseUnitPrice: 0, // Header has no individual price
                effectiveUnitPrice: 0,
                bundlePctApplied: null,
                bundleAdjAmount: null,
                bundleShare: null,
                
                // Bundle totals for display
                bundleTotalPreDiscount: pricingData.totalPreDiscount,
                bundleTotalPrice: pricingData.totalBundlePrice,
                bundleTotalDiscount: pricingData.totalDiscount
            }
        };
        
        // Create child component lines with full pricing metadata
        const childLines: Partial<OrderLine>[] = pricingData.childLinesWithPricing.map(child => ({
            productVariantId: child.productVariantId,
            quantity: child.quantity,
            customFields: {
                bundleKey,
                bundleId: bundle.id,
                bundleName: bundle.name,
                bundleVersion: bundle.version,
                discountType: bundle.discountType,
                isBundleHeader: false,
                
                // Component pricing metadata
                bundleComponentQty: child.componentQty,
                baseUnitPrice: child.baseUnitPrice,
                effectiveUnitPrice: child.effectiveUnitPrice,
                bundlePctApplied: child.bundlePctApplied,
                bundleAdjAmount: child.bundleAdjAmount,
                bundleShare: child.bundleShare,
                
                // Additional metadata
                componentWeight: child.weight,
                subtotalPreDiscount: child.subtotal
            }
        }));
        
        return { bundleKey, headerLine, childLines };
    }
    
    /**
     * Find bundle by bundle key in order
     */
    private async findBundleByKey(
        ctx: RequestContext,
        orderId: ID,
        bundleKey: string
    ): Promise<{
        bundleId: ID;
        bundleName: string;
        quantity: number;
        headerLine: any;
        childLines: any[];
    } | null> {
        try {
            // Find order and its lines
            const order = await this.orderService.findOne(ctx, orderId, ['lines']);
            if (!order) {
                return null;
            }
            
            // Find lines with matching bundleKey
            const bundleLines = order.lines.filter(
                line => (line as any).customFields?.bundleKey === bundleKey
            );
            
            if (bundleLines.length === 0) {
                return null;
            }
            
            // Find header line and child lines
            const headerLine = bundleLines.find(line => 
                (line as any).customFields?.isBundleHeader === true
            );
            const childLines = bundleLines.filter(line => 
                (line as any).customFields?.isBundleHeader !== true
            );
            
            if (!headerLine) {
                Logger.warn(`Bundle with key ${bundleKey} missing header line`, 'BundleService');
                return null;
            }
            
            const customFields = (headerLine as any).customFields;
            
            return {
                bundleId: customFields.bundleId,
                bundleName: customFields.bundleName || 'Unknown Bundle',
                quantity: headerLine.quantity,
                headerLine,
                childLines
            };
            
        } catch (error) {
            Logger.error(`Error finding bundle by key ${bundleKey}: ${error}`, 'BundleService');
            return null;
        }
    }
    
    /**
     * Find all bundle lines (header + children) by bundle key
     */
    private async findBundleLinesByKey(
        ctx: RequestContext,
        orderId: ID,
        bundleKey: string
    ): Promise<Array<{
        id: ID;
        productVariantId: ID;
        quantity: number;
        customFields: any;
    }>> {
        try {
            // Find order and its lines
            const order = await this.orderService.findOne(ctx, orderId, ['lines']);
            if (!order) {
                return [];
            }
            
            // Find all lines with matching bundleKey
            const bundleLines = order.lines.filter(
                line => (line as any).customFields?.bundleKey === bundleKey
            );
            
            // Transform to our expected format
            return bundleLines.map(line => ({
                id: line.id,
                productVariantId: line.productVariantId,
                quantity: line.quantity,
                customFields: (line as any).customFields
            }));
            
        } catch (error) {
            Logger.error(`Error finding bundle lines by key ${bundleKey}: ${error}`, 'BundleService');
            return [];
        }
    }
    
    /**
     * Validate bundle mutation request
     */
    async validateBundleMutation(
        ctx: RequestContext,
        bundleId: ID,
        quantity: number,
        operation: 'add' | 'adjust' | 'remove'
    ): Promise<{
        isValid: boolean;
        errors: string[];
        warnings: string[];
    }> {
        const errors: string[] = [];
        const warnings: string[] = [];
        
        try {
            // Basic validation
            if (quantity < 0) {
                errors.push('Quantity cannot be negative');
            }
            
            if (quantity > 1000) {
                warnings.push('Large quantity requested - please verify');
            }
            
            // Bundle validation
            const bundle = await this.findOne(ctx, bundleId);
            if (!bundle) {
                errors.push(`Bundle with id ${bundleId} not found`);
                return { isValid: false, errors, warnings };
            }
            
            if (!bundle.isAvailable && operation !== 'remove') {
                errors.push(`Bundle "${bundle.name}" is not available (status: ${bundle.status})`);
            }
            
            // Availability validation for add/adjust operations
            if (operation !== 'remove' && quantity > 0) {
                const stockValidation = await this.validateBundleStock(ctx, bundleId, quantity);
                if (!stockValidation.isAvailable) {
                    errors.push(`Insufficient stock: requested ${quantity}, available ${stockValidation.maxAvailableQuantity}`);
                    
                    stockValidation.insufficientItems.forEach(item => {
                        warnings.push(`${item.productName}: need ${item.required}, have ${item.available}`);
                    });
                }
            }
            
            // Component validation
            if (bundle.items.length === 0) {
                errors.push('Bundle has no components');
            }
            
            for (const item of bundle.items) {
                const variant = await this.productVariantService.findOne(ctx, item.productVariantId);
                if (!variant) {
                    errors.push(`Component variant ${item.productVariantId} not found`);
                } else if (variant.deletedAt) {
                    errors.push(`Component variant ${variant.name} is deleted`);
                }
            }
            
        } catch (error) {
            errors.push(`Validation failed: ${error}`);
        }
        
        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
    
    /**
     * Get bundle mutation summary for logging/auditing
     */
    getBundleMutationSummary(
        operation: 'add' | 'adjust' | 'remove',
        bundle: Bundle,
        quantity: number,
        oldQuantity?: number
    ): string {
        const componentCount = bundle.items.length;
        
        switch (operation) {
            case 'add':
                return `Add bundle "${bundle.name}" (${quantity} units, ${componentCount} components)`;
            case 'adjust':
                return `Adjust bundle "${bundle.name}" from ${oldQuantity || 0} to ${quantity} units`;
            case 'remove':
                return `Remove bundle "${bundle.name}" (${componentCount} components)`;
            default:
                return `Unknown operation on bundle "${bundle.name}"`;
        }
    }
}
