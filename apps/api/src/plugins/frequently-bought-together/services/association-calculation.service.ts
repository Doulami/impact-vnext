import { Injectable, Logger } from '@nestjs/common';
import { TransactionalConnection, Order, OrderLine, Product, ChannelService } from '@vendure/core';
import { In, MoreThanOrEqual } from 'typeorm';
import { ProductAssociation } from '../entities/product-association.entity';
import { AssociationSettings } from '../entities/association-settings.entity';
import { ProductPairData, AssociationScore, ScoringWeights } from '../types/association.types';

/**
 * AssociationCalculationService
 * 
 * Core service for analyzing order history and calculating product associations.
 * Implements multi-factor scoring: frequency + recency + value.
 */
@Injectable()
export class AssociationCalculationService {
    private readonly logger = new Logger(AssociationCalculationService.name);

    constructor(
        private connection: TransactionalConnection,
        private channelService: ChannelService
    ) {}

    /**
     * Main entry point: Calculate associations from orders
     */
    async calculateAssociations(settings: AssociationSettings): Promise<number> {
        const startTime = Date.now();
        this.logger.log('Starting association calculation...');

        try {
            // Get default channel
            const channel = await this.channelService.getDefaultChannel();
            const channelId = String(channel.id);
            
            // Calculate date range
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - settings.analysisTimeWindowDays);

            // Fetch orders in time window
            const orders = await this.fetchOrders(cutoffDate, channelId);
            this.logger.log(`Found ${orders.length} orders in time window`);

            if (orders.length === 0) {
                return 0;
            }

            // Build co-occurrence matrix
            const pairData = await this.buildCooccurrenceMatrix(orders);
            this.logger.log(`Found ${pairData.size} unique product pairs`);

            // Calculate scores for each pair
            const associations: ProductAssociation[] = [];
            const weights: ScoringWeights = {
                frequency: settings.frequencyWeight,
                recency: settings.recencyWeight,
                value: settings.valueWeight
            };

            for (const [pairKey, data] of pairData.entries()) {
                // Skip if below threshold
                if (data.cooccurrenceCount < settings.minCooccurrenceThreshold) {
                    continue;
                }

                // Check if source or target is a bundle product
                if (await this.isBundle(data.sourceProductId) || await this.isBundle(data.targetProductId)) {
                    continue;
                }

                // Calculate scores
                const scores = await this.calculateScores(
                    data,
                    orders.length,
                    settings.analysisTimeWindowDays,
                    weights
                );

                // Filter by score threshold
                if (scores.finalScore < settings.minScoreThreshold) {
                    continue;
                }

                // Filter by lift
                if (scores.lift !== undefined && scores.lift <= 1.0) {
                    continue;
                }

                // Create association entity
                const association = new ProductAssociation({
                    sourceProductId: data.sourceProductId,
                    targetProductId: data.targetProductId,
                    channelId: channelId,
                    cooccurrenceCount: data.cooccurrenceCount,
                    frequencyScore: scores.frequencyScore,
                    recencyScore: scores.recencyScore,
                    valueScore: scores.valueScore,
                    finalScore: scores.finalScore,
                    lift: scores.lift,
                    lastCalculated: new Date()
                });

                associations.push(association);
            }

            this.logger.log(`Generated ${associations.length} associations after filtering`);

            // Save to database
            await this.saveAssociations(associations, channelId);

            const duration = Date.now() - startTime;
            this.logger.log(`Association calculation complete in ${duration}ms`);

            return associations.length;

        } catch (error) {
            this.logger.error(`Association calculation failed: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }

    /**
     * Fetch orders within time window
     */
    private async fetchOrders(cutoffDate: Date, channelId: string): Promise<Order[]> {
        const orderRepo = this.connection.getRepository(Order);
        
        return await orderRepo.find({
            where: {
                orderPlacedAt: MoreThanOrEqual(cutoffDate),
                // Only include completed orders
                state: In(['PaymentSettled', 'Shipped', 'Delivered'])
            },
            relations: ['lines', 'lines.productVariant', 'lines.productVariant.product'],
            order: { orderPlacedAt: 'DESC' }
        });
    }

    /**
     * Build co-occurrence matrix from orders
     */
    private async buildCooccurrenceMatrix(orders: Order[]): Promise<Map<string, ProductPairData>> {
        const pairData = new Map<string, ProductPairData>();

        for (const order of orders) {
            if (!order.lines || order.lines.length < 2) {
                continue; // Need at least 2 products
            }

            // Extract product IDs (excluding bundle components)
            const productIds = this.extractProductIds(order.lines);
            
            if (productIds.length < 2) {
                continue;
            }

            // Get order total
            const orderTotal = order.totalWithTax || order.total || 0;
            const orderDate = order.orderPlacedAt || order.updatedAt;

            // Create pairs (A, B) where A != B
            for (let i = 0; i < productIds.length; i++) {
                for (let j = 0; j < productIds.length; j++) {
                    if (i === j) continue;

                    const sourceId = productIds[i];
                    const targetId = productIds[j];
                    const pairKey = `${sourceId}-${targetId}`;

                    if (!pairData.has(pairKey)) {
                        pairData.set(pairKey, {
                            sourceProductId: sourceId,
                            targetProductId: targetId,
                            cooccurrenceCount: 0,
                            orderDates: [],
                            cartValues: []
                        });
                    }

                    const data = pairData.get(pairKey)!;
                    data.cooccurrenceCount++;
                    data.orderDates.push(orderDate);
                    data.cartValues.push(orderTotal);
                }
            }
        }

        return pairData;
    }

    /**
     * Extract unique product IDs from order lines
     * Excludes bundle components
     */
    private extractProductIds(lines: OrderLine[]): string[] {
        const productIds = new Set<string>();

        for (const line of lines) {
            // Skip bundle components
            if ((line.customFields as any)?.bundleId) {
                continue;
            }

            if (line.productVariant?.product?.id) {
                productIds.add(String(line.productVariant.product.id));
            }
        }

        return Array.from(productIds);
    }

    /**
     * Calculate all scores for a product pair
     */
    private async calculateScores(
        data: ProductPairData,
        totalOrders: number,
        timeWindowDays: number,
        weights: ScoringWeights
    ): Promise<AssociationScore> {
        // Frequency score
        const frequencyScore = this.calculateFrequencyScore(
            data.cooccurrenceCount,
            totalOrders
        );

        // Recency score
        const recencyScore = this.calculateRecencyScore(
            data.orderDates,
            timeWindowDays
        );

        // Value score
        const valueScore = this.calculateValueScore(
            data.cartValues
        );

        // Final weighted score
        const finalScore = 
            weights.frequency * frequencyScore +
            weights.recency * recencyScore +
            weights.value * valueScore;

        // Lift calculation (optional)
        const lift = await this.calculateLift(
            data.sourceProductId,
            data.targetProductId,
            data.cooccurrenceCount,
            totalOrders
        );

        return {
            frequencyScore,
            recencyScore,
            valueScore,
            finalScore,
            lift
        };
    }

    /**
     * Calculate frequency confidence score
     * freq_conf = cooccurrence_count / total_orders_with_source
     */
    private calculateFrequencyScore(cooccurrenceCount: number, totalOrders: number): number {
        if (totalOrders === 0) return 0;
        
        // Normalize to 0-1
        const rawScore = cooccurrenceCount / totalOrders;
        return Math.min(1.0, rawScore);
    }

    /**
     * Calculate recency score with exponential decay
     * Recent orders weighted more heavily
     */
    private calculateRecencyScore(orderDates: Date[], timeWindowDays: number): number {
        if (orderDates.length === 0) return 0;

        const now = new Date();
        let weightedSum = 0;
        let totalWeight = 0;

        for (const orderDate of orderDates) {
            const daysAgo = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24);
            
            // Exponential decay: e^(-days / window)
            const weight = Math.exp(-daysAgo / timeWindowDays);
            
            weightedSum += weight;
            totalWeight += 1;
        }

        if (totalWeight === 0) return 0;

        // Normalize
        const rawScore = weightedSum / totalWeight;
        return Math.min(1.0, rawScore);
    }

    /**
     * Calculate value score based on cart values
     * Normalized average cart value
     */
    private calculateValueScore(cartValues: number[]): number {
        if (cartValues.length === 0) return 0;

        // Calculate average
        const avgCart = cartValues.reduce((sum, val) => sum + val, 0) / cartValues.length;

        // Get min/max for normalization
        const minCart = Math.min(...cartValues);
        const maxCart = Math.max(...cartValues);

        if (maxCart === minCart) return 0.5; // All same value

        // Normalize to 0-1
        const normalized = (avgCart - minCart) / (maxCart - minCart);
        return Math.min(1.0, Math.max(0, normalized));
    }

    /**
     * Calculate lift metric
     * lift = confidence / support
     * Values > 1 indicate association is stronger than random
     */
    private async calculateLift(
        sourceProductId: string,
        targetProductId: string,
        cooccurrenceCount: number,
        totalOrders: number
    ): Promise<number | undefined> {
        if (totalOrders === 0) return undefined;

        try {
            // Get support for target product (how often it appears overall)
            const orderLineRepo = this.connection.getRepository(OrderLine);
            
            const targetOrderCount = await orderLineRepo
                .createQueryBuilder('line')
                .innerJoin('line.productVariant', 'variant')
                .where('variant.productId = :productId', { productId: targetProductId })
                .andWhere('line.customFields->>\'bundleId\' IS NULL') // Exclude bundle components
                .getCount();

            const support = targetOrderCount / totalOrders;
            
            if (support === 0) return undefined;

            const confidence = cooccurrenceCount / totalOrders;
            const lift = confidence / support;

            return lift;

        } catch (error) {
            this.logger.warn(`Failed to calculate lift for ${sourceProductId}-${targetProductId}: ${error}`);
            return undefined;
        }
    }

    /**
     * Check if product is a bundle
     */
    private async isBundle(productId: string): Promise<boolean> {
        const productRepo = this.connection.getRepository(Product);
        
        const product = await productRepo.findOne({
            where: { id: productId }
        });

        return (product?.customFields as any)?.isBundle === true;
    }

    /**
     * Save associations to database
     * Deletes existing associations for the channel first
     */
    private async saveAssociations(associations: ProductAssociation[], channelId: string): Promise<void> {
        const repo = this.connection.getRepository(ProductAssociation);

        // Delete existing associations for this channel
        await repo.delete({ channelId });

        // Bulk insert new associations
        if (associations.length > 0) {
            await repo.save(associations, { chunk: 500 });
        }

        this.logger.log(`Saved ${associations.length} associations`);
    }
}
