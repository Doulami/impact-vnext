/**
 * Plugin System Event Manager
 *
 * Handles event emission and subscription for plugin system
 */
import { EventName, EventPayload } from './types';
export declare class PluginEventManager {
    private emitter;
    private eventHistory;
    private maxHistorySize;
    constructor();
    /**
     * Emit an event to all registered listeners
     */
    emit(eventName: EventName, data: any, userId?: string): void;
    /**
     * Subscribe to a specific event
     */
    on(eventName: EventName | '*', callback: (payload: EventPayload) => void): void;
    /**
     * Subscribe to an event once
     */
    once(eventName: EventName | '*', callback: (payload: EventPayload) => void): void;
    /**
     * Unsubscribe from an event
     */
    off(eventName: EventName | '*', callback: (payload: EventPayload) => void): void;
    /**
     * Remove all listeners for an event
     */
    removeAllListeners(eventName?: EventName): void;
    /**
     * Get list of all registered event names
     */
    getEventNames(): EventName[];
    /**
     * Get number of listeners for an event
     */
    getListenerCount(eventName: EventName): number;
    /**
     * Get recent event history
     */
    getEventHistory(limit?: number): EventPayload[];
    /**
     * Clear event history
     */
    clearHistory(): void;
    /**
     * Get events filtered by type
     */
    getEventsByType(eventType: 'cart' | 'user' | 'order', limit?: number): EventPayload[];
    /**
     * Get events for a specific user
     */
    getEventsByUser(userId: string, limit?: number): EventPayload[];
    emitCartItemAdded(data: {
        itemId: string;
        productId: string;
        quantity: number;
    }, userId?: string): void;
    emitCartItemRemoved(data: {
        itemId: string;
        productId: string;
    }, userId?: string): void;
    emitCartQuantityChanged(data: {
        itemId: string;
        oldQuantity: number;
        newQuantity: number;
    }, userId?: string): void;
    emitDiscountApplied(data: {
        discountId: string;
        amount: number;
        code?: string;
    }, userId?: string): void;
    emitCouponApplied(data: {
        code: string;
        discountAmount: number;
    }, userId?: string): void;
    emitCheckoutStarted(data: {
        cartId: string;
        total: number;
        itemCount: number;
    }, userId?: string): void;
    emitUserLogin(data: {
        userId: string;
        email: string;
    }, userId?: string): void;
    emitUserLogout(data: {
        userId: string;
    }, userId?: string): void;
    emitUserRegister(data: {
        userId: string;
        email: string;
    }, userId?: string): void;
    emitOrderCreated(data: {
        orderId: string;
        total: number;
        itemCount: number;
    }, userId?: string): void;
    emitOrderPaid(data: {
        orderId: string;
        paymentId: string;
        amount: number;
    }, userId?: string): void;
    emitOrderShipped(data: {
        orderId: string;
        trackingNumber: string;
    }, userId?: string): void;
    emitOrderCompleted(data: {
        orderId: string;
        completedAt: Date;
    }, userId?: string): void;
    private addToHistory;
    private setupLogging;
}
export declare const eventManager: PluginEventManager;
//# sourceMappingURL=events.d.ts.map