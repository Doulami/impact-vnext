import { Injectable } from '@nestjs/common';
import {
    RequestContext,
    TransactionalConnection,
    ListQueryBuilder,
    PaginatedList,
    ID,
    StockMovementService,
    ProductVariantService,
    OrderService,
    OrderLine,
    Logger,
} from '@vendure/core';
import { Bundle } from '../entities/bundle.entity';
import { BundleItem } from '../entities/bundle-item.entity';

export interface CreateBundleInput {
    name: string;
    slug?: string;
    description?: string;
    assets: string[];
    price: number;
    enabled: boolean;
    tags?: string[];
    category?: string;
    items: CreateBundleItemInput[];
}

export interface CreateBundleItemInput {
    productVariantId: ID;
    quantity: number;
    unitPrice: number;
    displayOrder?: number;
}

export interface UpdateBundleInput {
    id: ID;
    name?: string;
    slug?: string;
    description?: string;
    assets?: string[];
    price?: number;
    enabled?: boolean;
    tags?: string[];
    category?: string;
    items?: UpdateBundleItemInput[];
}

export interface UpdateBundleItemInput {
    id?: ID;
    productVariantId: ID;
    quantity: number;
    unitPrice: number;
    displayOrder?: number;
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
        private orderService: OrderService,
    ) {}

    /**
     * Create a new bundle
     */
    async create(ctx: RequestContext, input: CreateBundleInput): Promise<Bundle> {
        const bundle = new Bundle(input);
        
        // Validate that all component variants exist and are stockable
        for (const itemInput of input.items) {
            const variant = await this.productVariantService.findOne(ctx, itemInput.productVariantId);
            if (!variant) {
                throw new Error(`ProductVariant with id ${itemInput.productVariantId} not found`);
            }
            if (variant.trackInventory === 'FALSE') {
                Logger.warn(`Bundle component ${variant.name} does not track inventory`);
            }
        }

        const savedBundle = await this.connection.getRepository(ctx, Bundle).save(bundle);

        // Create bundle items
        const bundleItems = input.items.map(itemInput => new BundleItem({
            ...itemInput,
            bundleId: savedBundle.id,
        }));

        await this.connection.getRepository(ctx, BundleItem).save(bundleItems);

        const result = await this.findOne(ctx, savedBundle.id);
        if (!result) {
            throw new Error('Failed to retrieve created bundle');
        }
        return result;
    }

    /**
     * Update an existing bundle
     */
    async update(ctx: RequestContext, input: UpdateBundleInput): Promise<Bundle> {
        const bundle = await this.findOne(ctx, input.id);
        if (!bundle) {
            throw new Error(`Bundle with id ${input.id} not found`);
        }

        // Update bundle properties
        Object.assign(bundle, input);
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
        return this.connection.getRepository(ctx, Bundle).findOne({
            where: { id },
            relations: ['items', 'items.productVariant'],
        });
    }

    /**
     * Find all bundles with pagination and filtering
     */
    async findAll(ctx: RequestContext, options: BundleListOptions): Promise<PaginatedList<Bundle>> {
        return this.listQueryBuilder
            .build(Bundle, options, {
                relations: ['items', 'items.productVariant'],
                ctx,
            })
            .getManyAndCount()
            .then(([items, totalItems]) => ({
                items,
                totalItems,
            }));
    }

    /**
     * Validate bundle stock availability as per documentation specification
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

        const insufficientItems: Array<{
            variantId: string;
            productName: string;
            required: number;
            available: number;
            shortfall: number;
        }> = [];

        let maxAvailableQuantity = Infinity;

        for (const item of bundle.items) {
            const variant = item.productVariant;
            const required = item.quantity * requestedQuantity;
            // Get stock level from stockLevels array - default to 0 if not available
            const stockLevel = variant.stockLevels?.[0];
            const available = stockLevel ? stockLevel.stockOnHand : 0;

            if (available < required) {
                insufficientItems.push({
                    variantId: variant.id.toString(),
                    productName: variant.name,
                    required,
                    available,
                    shortfall: required - available
                });
            }

            // Calculate max possible quantity for this component
            const maxForThisItem = Math.floor(available / item.quantity);
            maxAvailableQuantity = Math.min(maxAvailableQuantity, maxForThisItem);
        }

        return {
            isAvailable: insufficientItems.length === 0,
            insufficientItems,
            maxAvailableQuantity: maxAvailableQuantity === Infinity ? 0 : maxAvailableQuantity
        };
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
            const potentialSavings = componentTotal - bundle.price;

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
}