import { DeepPartial, ID } from '@vendure/common/lib/shared-types';
import { HasCustomFields, VendureEntity, Asset } from '@vendure/core';
import { Column, Entity, OneToMany, ManyToMany, JoinTable, ManyToOne } from 'typeorm';
import { BundleItem } from './bundle-item.entity';

/**
 * Bundle Status Enum
 */
export enum BundleStatus {
    DRAFT = 'DRAFT',
    ACTIVE = 'ACTIVE',
    EXPIRED = 'EXPIRED', 
    BROKEN = 'BROKEN',
    ARCHIVED = 'ARCHIVED'
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
 * - Tracks status lifecycle (DRAFT → ACTIVE → EXPIRED/BROKEN → ARCHIVED)
 * - Supports both fixed-price and percentage discounts
 * - Version controlled for auditability
 */
@Entity()
export class Bundle extends VendureEntity implements HasCustomFields {
    constructor(input?: DeepPartial<Bundle>) {
        super(input);
    }

    @Column()
    name: string;

    @Column({ unique: true, nullable: true })
    slug?: string;

    @Column('text', { nullable: true })
    description?: string;

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

    @ManyToMany(() => Asset, { eager: true })
    @JoinTable({
        name: 'bundle_assets',
        joinColumn: { name: 'bundle_id', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'asset_id', referencedColumnName: 'id' }
    })
    assets: Asset[];

    @ManyToOne(() => Asset, { nullable: true, eager: true })
    featuredAsset?: Asset; // Primary bundle image (syncs to shell product)

    @Column('simple-json', { nullable: true })
    tags?: string[]; // For categorization (performance, muscle-gain, etc.)

    @Column({ nullable: true })
    category?: string; // Bundle category

    // Scheduling & Gating (Phase 1)
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

    // Shell product linkage (optional but recommended for SEO/PLP)
    @Column({ nullable: true })
    shellProductId?: string; // ID of the Product shell used for PDP/PLP/SEO

    // Backwards compatibility fields (deprecated but kept for existing code)
    @Column({ default: true })
    enabled: boolean; // Deprecated: Use status instead
    
    @Column('decimal', { precision: 10, scale: 2, nullable: true })
    price?: number; // Deprecated: Use effectivePrice computed property instead

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
            console.log('[Bundle effectivePrice] Calculating for bundle', this.id, 'fixedPrice:', this.fixedPrice, 'items count:', this.items?.length);
            if (this.items?.length > 0) {
                // Find first item with valid pricing to calculate tax ratio
                for (const item of this.items) {
                    console.log('[Bundle effectivePrice] Checking item:', item.id, 'variant:', item.productVariant?.id, 'price:', item.productVariant?.price, 'priceWithTax:', item.productVariant?.priceWithTax);
                    if (item.productVariant?.price > 0 && item.productVariant?.priceWithTax > 0) {
                        const taxRatio = item.productVariant.priceWithTax / item.productVariant.price;
                        const preTaxPrice = Math.round(this.fixedPrice / taxRatio);
                        console.log('[Bundle effectivePrice] Tax ratio:', taxRatio, 'Pre-tax price:', preTaxPrice);
                        return preTaxPrice;
                    }
                }
            }
            console.log('[Bundle effectivePrice] Fallback: returning fixedPrice as-is');
            // Fallback: if no items or can't determine tax, return as-is (assume admin entered pre-tax)
            return this.fixedPrice;
        }
        
        if (this.discountType === BundleDiscountType.PERCENT && this.percentOff !== null && this.percentOff !== undefined) {
            // Calculate from PRE-TAX component prices, apply discount
            const componentTotal = this.items?.reduce((sum, item) => {
                const price = item.productVariant?.price || 0;
                return sum + (price * item.quantity);
            }, 0) || 0;
            return Math.round(componentTotal * (1 - this.percentOff / 100));
        }
        
        // Backwards compatibility: fall back to legacy price field
        return this.price ? Math.round(this.price * 100) : 0;
    }

    /**
     * Calculate total savings compared to buying components separately (PRE-TAX)
     * NOTE: Uses pre-tax prices for consistency with effectivePrice calculation
     */
    get totalSavings(): number {
        const componentTotal = this.items?.reduce((sum, item) => sum + (item.productVariant.price * item.quantity), 0) || 0;
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
        
        // Basic validation
        if (!this.name?.trim()) {
            errors.push('Bundle name is required');
        }
        
        if (this.name && this.name.length > 255) {
            errors.push('Bundle name cannot exceed 255 characters');
        }
        
        if (this.slug && this.slug.length > 255) {
            errors.push('Bundle slug cannot exceed 255 characters');
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
            const componentTotal = this.items.reduce((sum, item) => sum + (item.productVariant.price * item.quantity), 0);
            if (this.fixedPrice && this.fixedPrice >= componentTotal) {
                errors.push('Fixed price must be less than component total to provide savings');
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
        this.price = priceInCents / 100; // Update legacy field for backwards compatibility
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
        // Update legacy price field based on current component prices
        if (this.items?.length > 0) {
            const componentTotal = this.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
            this.price = componentTotal * (1 - percent / 100);
        }
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
        this.enabled = true; // Keep backwards compatibility
    }
    
    /**
     * Mark bundle as BROKEN (when components become unavailable)
     */
    markBroken(reason?: string): void {
        if (this.status === BundleStatus.ACTIVE) {
            this.status = BundleStatus.BROKEN;
            this.enabled = false; // Keep backwards compatibility
            // Could store reason in customFields if needed
            if (reason && this.customFields) {
                this.customFields.brokenReason = reason;
                this.customFields.brokenAt = new Date().toISOString();
            }
        }
    }
    
    /**
     * Archive bundle (soft delete)
     */
    archive(): void {
        this.status = BundleStatus.ARCHIVED;
        this.enabled = false; // Keep backwards compatibility
    }
    
    /**
     * Restore bundle from BROKEN to ACTIVE if valid
     */
    restore(): boolean {
        if (this.status === BundleStatus.BROKEN && this.validate().length === 0) {
            this.status = BundleStatus.ACTIVE;
            this.enabled = true; // Keep backwards compatibility
            if (this.customFields) {
                delete this.customFields.brokenReason;
                delete this.customFields.brokenAt;
            }
            return true;
        }
        return false;
    }
    
    /**
     * Check if bundle is available for add-to-cart
     * Returns true only if status is ACTIVE AND bundle is within date range
     * Note: EXPIRED bundles are not available even if manually set back to ACTIVE
     */
    get isAvailable(): boolean {
        return this.status === BundleStatus.ACTIVE && this.isWithinSchedule();
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
     */
    get statusDescription(): string {
        switch (this.status) {
            case BundleStatus.DRAFT:
                return 'Draft - Not yet published';
            case BundleStatus.ACTIVE:
                return 'Active - Available for purchase';
            case BundleStatus.BROKEN:
                return 'Broken - Components unavailable';
            case BundleStatus.ARCHIVED:
                return 'Archived - No longer available';
            default:
                return 'Unknown status';
        }
    }
}
