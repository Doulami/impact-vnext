import { DeepPartial, ID } from '@vendure/common/lib/shared-types';
import { HasCustomFields, VendureEntity, Asset, Product } from '@vendure/core';
import { Column, Entity, OneToMany, ManyToMany, JoinTable, ManyToOne } from 'typeorm';
import { BundleItem } from './bundle-item.entity';

/**
 * Bundle Status Enum
 * 
 * Simplified to only DB-stored statuses:
 * - DRAFT: Bundle being configured
 * - ACTIVE: Bundle published and exists
 * 
 * Other states are computed:
 * - Expired: computed from validTo date
 * - Broken: computed from component availability
 * - Unavailable: computed from product.enabled + dates + stock
 */
export enum BundleStatus {
    DRAFT = 'DRAFT',
    ACTIVE = 'ACTIVE'
}

/**
 * Bundle Discount Type Enum
 */
export enum BundleDiscountType {
    FIXED = 'fixed',
    PERCENT = 'percent'
}

/**
 * Bundle Entity - Bundle Plugin v2
 * 
 * Represents a bundle definition with exploded bundle support:
 * - Manages bundle composition and discount rules
 * - Tracks status lifecycle (DRAFT → ACTIVE)
 * - Expired/Broken states are computed at runtime
 * - Supports both fixed-price and percentage discounts
 * - Version controlled for auditability
 */
@Entity()
export class Bundle extends VendureEntity implements HasCustomFields {
    constructor(input?: DeepPartial<Bundle>) {
        super(input);
    }

    // Shell product linkage - REQUIRED, source of truth for name/slug/description
    @ManyToOne(() => Product, { eager: false })
    shellProduct?: Product;

    @Column()
    shellProductId: string;

    @Column({
        type: 'enum',
        enum: BundleStatus,
        default: BundleStatus.DRAFT
    })
    status: BundleStatus;

    @Column({
        type: 'enum',
        enum: BundleDiscountType
    })
    discountType: BundleDiscountType;

    @Column('int', { nullable: true })
    fixedPrice?: number; // Price in cents for fixed-price bundles

    @Column('decimal', { precision: 5, scale: 2, nullable: true })
    percentOff?: number; // Percentage off (0-100) for percent bundles

    @Column('int', { default: 1 })
    version: number; // Incremented on publish to ACTIVE

    // Scheduling & Gating
    @Column('timestamp', { nullable: true })
    validFrom?: Date; // Bundle becomes available at this date

    @Column('timestamp', { nullable: true })
    validTo?: Date; // Bundle ends at this date

    @Column('int', { nullable: true })
    bundleCap?: number; // Optional marketing cap (A_shell)

    @Column('int', { default: 0 })
    bundleReservedOpen: number; // Count of bundles in paid-but-not-shipped orders (for v3 reservation system)

    @Column({ default: false })
    allowExternalPromos: boolean; // Per-bundle external promotion policy

    @OneToMany(() => BundleItem, bundleItem => bundleItem.bundle, {
        cascade: true,
        eager: true 
    })
    items: BundleItem[];

    // Phase 4.1: Audit fields for safety and lifecycle tracking
    @Column('text', { nullable: true })
    brokenReason?: string; // Reason why bundle was marked as BROKEN
    
    @Column('timestamp', { nullable: true })
    lastRecomputedAt?: Date; // Last time bundle pricing/availability was recomputed
    
    @Column('simple-json', { nullable: true })
    customFields: any;

    // Computed Properties

    /**
     * Get the effective bundle price based on discount type (PRE-TAX)
     * For fixed-price bundles: admin enters tax-inclusive price, we convert to pre-tax
     * For percent bundles: calculates from component PRE-TAX prices and percentage
     * Falls back to legacy price field for backwards compatibility
     * NOTE: Returns pre-tax price in cents - tax is applied by Vendure at checkout
     */
    get effectivePrice(): number {
        if (this.discountType === BundleDiscountType.FIXED && this.fixedPrice !== null && this.fixedPrice !== undefined) {
            // Admin enters tax-inclusive fixedPrice, convert to pre-tax using tax ratio from components
            if (this.items?.length > 0) {
                // Find first item with valid pricing to calculate tax ratio
                for (const item of this.items) {
                    if (item.productVariant?.price > 0 && item.productVariant?.priceWithTax > 0) {
                        const taxRatio = item.productVariant.priceWithTax / item.productVariant.price;
                        const preTaxPrice = Math.round(this.fixedPrice / taxRatio);
                        return preTaxPrice;
                    }
                }
            }
            // Fallback: if no items or can't determine tax, return as-is (assume admin entered pre-tax)
            return this.fixedPrice;
        }
        
        if (this.discountType === BundleDiscountType.PERCENT && this.percentOff !== null && this.percentOff !== undefined) {
            // Calculate from PRE-TAX component prices, apply discount
            const componentTotal = this.items?.reduce((sum, item) => {
                // Use unitPriceSnapshot (in cents) if available, fallback to productVariant.price
                const price = item.unitPriceSnapshot || item.productVariant?.price || 0;
                return sum + (price * item.quantity);
            }, 0) || 0;
            return Math.round(componentTotal * (1 - this.percentOff / 100));
        }
        
        return 0;
    }

    /**
     * Calculate total savings compared to buying components separately (WITH TAX)
     * NOTE: Uses priceWithTax to match frontend display prices
     */
    get totalSavings(): number {
        // Use unitPriceSnapshot if available, otherwise use productVariant pricing
        const componentTotal = this.items?.reduce((sum, item) => {
            const priceWithTax = item.productVariant?.priceWithTax || item.unitPriceSnapshot || 0;
            return sum + (priceWithTax * item.quantity);
        }, 0) || 0;
        
        // effectivePrice is pre-tax, so we need to apply tax ratio to compare with componentTotal
        if (this.items?.length > 0) {
            for (const item of this.items) {
                const price = item.unitPriceSnapshot || item.productVariant?.price || 0;
                const priceWithTax = item.productVariant?.priceWithTax || item.unitPriceSnapshot || 0;
                if (price > 0 && priceWithTax > 0) {
                    const taxRatio = priceWithTax / price;
                    const effectivePriceWithTax = Math.round(this.effectivePrice * taxRatio);
                    return Math.max(0, componentTotal - effectivePriceWithTax);
                }
            }
        }
        return Math.max(0, componentTotal - this.effectivePrice);
    }

    /**
     * Calculate virtual bundle stock (v3 reservation system)
     * Virtual Stock = max(0, Bundle Cap - Reserved Open)
     * Returns null if bundleCap is not set (unlimited availability from components)
     */
    get bundleVirtualStock(): number | null {
        if (this.bundleCap === null || this.bundleCap === undefined) {
            return null; // No cap set, availability driven by components only
        }
        return Math.max(0, this.bundleCap - (this.bundleReservedOpen || 0));
    }

    /**
     * Validate bundle configuration
     */
    validate(): string[] {
        const errors: string[] = [];
        
        // Shell product validation
        if (!this.shellProductId) {
            errors.push('Shell product is required');
        }
        
        if (!this.discountType) {
            errors.push('Discount type is required');
        }
        
        // Discount type validation
        if (this.discountType === BundleDiscountType.FIXED) {
            if (this.fixedPrice === null || this.fixedPrice === undefined || this.fixedPrice < 0) {
                errors.push('Fixed price must be set and non-negative for fixed-price bundles');
            }
            if (this.percentOff !== null && this.percentOff !== undefined) {
                errors.push('Cannot set both fixed price and percentage off');
            }
        }
        
        if (this.discountType === BundleDiscountType.PERCENT) {
            if (this.percentOff === null || this.percentOff === undefined || this.percentOff < 0 || this.percentOff > 100) {
                errors.push('Percentage off must be between 0 and 100 for percentage bundles');
            }
            if (this.fixedPrice !== null && this.fixedPrice !== undefined) {
                errors.push('Cannot set both fixed price and percentage off');
            }
        }
        
        // Items validation
        if (!this.items || this.items.length === 0) {
            errors.push('Bundle must contain at least one item');
        } else {
            // Validate individual items
            const itemErrors = this.validateItems();
            errors.push(...itemErrors);
        }
        
        // Business logic validation
        if (this.discountType === BundleDiscountType.FIXED && this.items?.length > 0) {
            // Use unitPriceSnapshot (in cents) instead of productVariant.price to avoid loading relation
            const componentTotal = this.items.reduce((sum, item) => {
                const itemPrice = item.unitPriceSnapshot || (item.productVariant?.price || 0);
                console.log(`Bundle validation - Item: unitPriceSnapshot=${item.unitPriceSnapshot}, quantity=${item.quantity}, itemPrice=${itemPrice}`);
                return sum + (itemPrice * item.quantity);
            }, 0);
            console.log(`Bundle validation - fixedPrice=${this.fixedPrice}, componentTotal=${componentTotal}`);
            if (this.fixedPrice && this.fixedPrice >= componentTotal) {
                errors.push(`Fixed price (${this.fixedPrice}) must be less than component total (${componentTotal}) to provide savings`);
            }
        }
        
        // Date validation
        if (this.validFrom && this.validTo && this.validFrom >= this.validTo) {
            errors.push('validFrom must be before validTo');
        }
        
        // Bundle cap validation
        if (this.bundleCap !== null && this.bundleCap !== undefined && this.bundleCap < 0) {
            errors.push('bundleCap must be non-negative');
        }
        
        return errors;
    }
    
    /**
     * Validate bundle items
     */
    private validateItems(): string[] {
        const errors: string[] = [];
        
        if (!this.items) return errors;
        
        // Check for duplicate variants
        const variantIds = this.items.map(item => item.productVariantId);
        const duplicateIds = variantIds.filter((id, index) => variantIds.indexOf(id) !== index);
        if (duplicateIds.length > 0) {
            errors.push(`Duplicate variants found: ${duplicateIds.join(', ')}`);
        }
        
        // Validate each item
        this.items.forEach((item, index) => {
            if (!item.productVariantId) {
                errors.push(`Item ${index + 1}: Product variant is required`);
            }
            if (!item.quantity || item.quantity <= 0) {
                errors.push(`Item ${index + 1}: Quantity must be positive`);
            }
            if (item.quantity > 1000) {
                errors.push(`Item ${index + 1}: Quantity cannot exceed 1000`);
            }
        });
        
        return errors;
    }
    
    /**
     * Set fixed price discount
     */
    setFixedPrice(priceInCents: number): void {
        if (priceInCents < 0) {
            throw new Error('Fixed price cannot be negative');
        }
        this.discountType = BundleDiscountType.FIXED;
        this.fixedPrice = priceInCents;
        this.percentOff = undefined;
    }
    
    /**
     * Set percentage discount
     */
    setPercentageDiscount(percent: number): void {
        if (percent < 0 || percent > 100) {
            throw new Error('Percentage must be between 0 and 100');
        }
        this.discountType = BundleDiscountType.PERCENT;
        this.percentOff = percent;
        this.fixedPrice = undefined;
    }
    
    /**
     * Check if bundle can transition to ACTIVE status
     */
    canActivate(): boolean {
        return this.validate().length === 0 && this.status === BundleStatus.DRAFT;
    }
    
    /**
     * Publish bundle to ACTIVE status
     * Increments version and updates status
     */
    publish(): void {
        if (!this.canActivate()) {
            throw new Error('Bundle cannot be activated: ' + this.validate().join(', '));
        }
        this.status = BundleStatus.ACTIVE;
        this.version += 1;
    }
    
    
    /**
     * Check if bundle is expired based on validTo date
     */
    get isExpired(): boolean {
        if (!this.validTo) return false;
        return new Date() > this.validTo;
    }
    
    /**
     * Check if bundle is broken (components missing/deleted)
     * Note: This requires items to be loaded with productVariant relation
     */
    get isBroken(): boolean {
        if (!this.items || this.items.length === 0) return true;
        // Check if any component variant is missing
        return this.items.some(item => !item.productVariant || item.productVariant.deletedAt);
    }
    
    /**
     * Check if bundle is available for add-to-cart
     * Computed from: status=ACTIVE + within date range + not broken
     */
    get isAvailable(): boolean {
        return this.status === BundleStatus.ACTIVE 
            && this.isWithinSchedule() 
            && !this.isBroken;
    }
    
    /**
     * Check if bundle is currently within its valid date range
     */
    isWithinSchedule(): boolean {
        const now = new Date();
        
        if (this.validFrom && now < this.validFrom) {
            return false;
        }
        
        if (this.validTo && now > this.validTo) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Get availability message for UI display
     */
    getAvailabilityMessage(): string {
        if (this.status !== BundleStatus.ACTIVE) {
            return this.statusDescription;
        }
        
        const now = new Date();
        
        if (this.validFrom && now < this.validFrom) {
            return `Available starting ${this.validFrom.toLocaleDateString()}`;
        }
        
        if (this.validTo && now > this.validTo) {
            return `This bundle ended on ${this.validTo.toLocaleDateString()}`;
        }
        
        return 'Available';
    }
    
    /**
     * Get human-readable status description
     * Includes computed states (expired, broken)
     */
    get statusDescription(): string {
        if (this.status === BundleStatus.DRAFT) {
            return 'Draft - Not yet published';
        }
        
        if (this.status === BundleStatus.ACTIVE) {
            if (this.isBroken) {
                return 'Broken - Components unavailable';
            }
            if (this.isExpired) {
                return 'Expired - Past end date';
            }
            if (!this.isWithinSchedule()) {
                return 'Scheduled - Not yet available';
            }
            return 'Active - Available for purchase';
        }
        
        return 'Unknown status';
    }
}
