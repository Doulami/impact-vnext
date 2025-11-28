import { Injectable, Logger } from '@nestjs/common';
import { TransactionalConnection, Product, ProductService, ChannelService } from '@vendure/core';
import { ProductAssociation } from '../entities/product-association.entity';
import { AssociationSettings } from '../entities/association-settings.entity';
import { DisplayContext, ProductRecommendation } from '../types/association.types';
import { In } from 'typeorm';

/**
 * RecommendationService
 * 
 * Service for querying calculated associations and formatting them for display.
 * Handles bundle exclusion rules and fallback to related products.
 */
@Injectable()
export class RecommendationService {
    private readonly logger = new Logger(RecommendationService.name);

    constructor(
        private connection: TransactionalConnection,
        private productService: ProductService,
        private channelService: ChannelService
    ) {}

    /**
     * Get recommendations for a single product
     */
    async getForProduct(
        productId: string,
        context: DisplayContext,
        settings: AssociationSettings
    ): Promise<Product[]> {
        try {
            // Check if source product is a bundle (bundles don't show associations)
            if (await this.isBundle(productId)) {
                return [];
            }

            // Get channel
            const channel = await this.channelService.getDefaultChannel();
            const channelId = String(channel.id);

            // Get associations from database
            const associationRepo = this.connection.getRepository(ProductAssociation);
            
            const associations = await associationRepo.find({
                where: {
                    sourceProductId: productId,
                    channelId: channelId
                },
                order: {
                    finalScore: 'DESC'
                },
                take: settings.maxRecommendationsPerProduct
            });

            // Extract product IDs
            let productIds = associations.map(a => a.targetProductId);

            // Filter out bundles
            productIds = await this.filterBundles(productIds);

            // Get products
            let products = await this.getProductsByIds(productIds);

            // If not enough recommendations and fallback enabled, add related products
            if (products.length < settings.maxRecommendationsPerProduct && 
                settings.fallbackToRelatedProducts) {
                
                products = await this.mergeWithRelatedProducts(
                    productId,
                    products,
                    settings.maxRecommendationsPerProduct
                );
            }

            return products;

        } catch (error) {
            this.logger.error(`Failed to get recommendations for product ${productId}: ${error}`);
            return [];
        }
    }

    /**
     * Get recommendations for cart (multiple products)
     * Aggregates associations for all cart items
     */
    async getForCart(
        productIds: string[],
        settings: AssociationSettings
    ): Promise<Product[]> {
        try {
            if (productIds.length === 0) {
                return [];
            }

            // Get channel
            const channel = await this.channelService.getDefaultChannel();
            const channelId = String(channel.id);

            // Get associations for all cart products
            const associationRepo = this.connection.getRepository(ProductAssociation);
            
            const associations = await associationRepo.find({
                where: {
                    sourceProductId: In(productIds),
                    channelId: channelId
                }
            });

            // Aggregate scores by target product
            const scoreMap = new Map<string, number>();
            
            for (const assoc of associations) {
                // Skip if target is already in cart
                if (productIds.includes(assoc.targetProductId)) {
                    continue;
                }

                const currentScore = scoreMap.get(assoc.targetProductId) || 0;
                scoreMap.set(assoc.targetProductId, currentScore + assoc.finalScore);
            }

            // Sort by aggregated score
            const sortedProducts = Array.from(scoreMap.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, settings.maxRecommendationsPerProduct)
                .map(([productId]) => productId);

            // Filter out bundles
            const filteredIds = await this.filterBundles(sortedProducts);

            // Get products
            return await this.getProductsByIds(filteredIds);

        } catch (error) {
            this.logger.error(`Failed to get cart recommendations: ${error}`);
            return [];
        }
    }

    /**
     * Filter out bundle products from list
     */
    private async filterBundles(productIds: string[]): Promise<string[]> {
        if (productIds.length === 0) return [];

        const productRepo = this.connection.getRepository(Product);
        
        const products = await productRepo.find({
            where: {
                id: In(productIds)
            },
            select: ['id', 'customFields']
        });

        return products
            .filter(p => (p.customFields as any)?.isBundle !== true)
            .map(p => String(p.id));
    }

    /**
     * Check if a product is a bundle
     */
    private async isBundle(productId: string): Promise<boolean> {
        const productRepo = this.connection.getRepository(Product);
        
        const product = await productRepo.findOne({
            where: { id: productId },
            select: ['id', 'customFields']
        });

        return (product?.customFields as any)?.isBundle === true;
    }

    /**
     * Get products by IDs
     */
    private async getProductsByIds(productIds: string[]): Promise<Product[]> {
        if (productIds.length === 0) return [];

        const productRepo = this.connection.getRepository(Product);
        
        const products = await productRepo.find({
            where: {
                id: In(productIds),
                enabled: true
            },
            relations: ['variants', 'featuredAsset']
        });

        // Return in same order as input
        const productMap = new Map(products.map(p => [p.id, p]));
        return productIds
            .map(id => productMap.get(id))
            .filter((p): p is Product => p !== undefined);
    }

    /**
     * Merge recommendations with related products as fallback
     */
    private async mergeWithRelatedProducts(
        sourceProductId: string,
        existingProducts: Product[],
        maxCount: number
    ): Promise<Product[]> {
        try {
            // Get source product with related products
            const sourceProduct = await this.connection.getRepository(Product).findOne({
                where: { id: sourceProductId },
                relations: ['customFields']
            });

            if (!sourceProduct) {
                return existingProducts;
            }

            // In Vendure, related products are typically handled through collections or custom fields
            // For now, return existing products since related products implementation varies
            // TODO: Implement based on your specific related products setup
            
            return existingProducts;

        } catch (error) {
            this.logger.warn(`Failed to merge with related products: ${error}`);
            return existingProducts;
        }
    }

    /**
     * Get statistics about associations
     */
    async getStats(channelId?: string): Promise<{
        totalAssociations: number;
        productsWithRecommendations: number;
        averageRecommendationsPerProduct: number;
    }> {
        try {
            const channel = channelId 
                ? { id: channelId } 
                : await this.channelService.getDefaultChannel();
            const cid = String(channel.id);

            const associationRepo = this.connection.getRepository(ProductAssociation);
            
            const totalAssociations = await associationRepo.count({
                where: { channelId: cid }
            });

            // Count unique source products
            const result = await associationRepo
                .createQueryBuilder('assoc')
                .select('COUNT(DISTINCT assoc.sourceProductId)', 'count')
                .where('assoc.channelId = :channelId', { channelId: cid })
                .getRawOne();

            const productsWithRecommendations = parseInt(result?.count || '0');

            const averageRecommendationsPerProduct = productsWithRecommendations > 0
                ? totalAssociations / productsWithRecommendations
                : 0;

            return {
                totalAssociations,
                productsWithRecommendations,
                averageRecommendationsPerProduct: Math.round(averageRecommendationsPerProduct * 100) / 100
            };

        } catch (error) {
            this.logger.error(`Failed to get stats: ${error}`);
            return {
                totalAssociations: 0,
                productsWithRecommendations: 0,
                averageRecommendationsPerProduct: 0
            };
        }
    }
}
