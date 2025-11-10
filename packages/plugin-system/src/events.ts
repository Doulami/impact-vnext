/**
 * Plugin System Event Manager
 * 
 * Handles event emission and subscription for plugin system
 */

import { EventEmitter } from 'eventemitter3';
import { EventName, EventPayload, CartEvents, UserEvents, OrderEvents } from './types';

export class PluginEventManager {
  private emitter: EventEmitter;
  private eventHistory: EventPayload[] = [];
  private maxHistorySize: number = 1000;

  constructor() {
    this.emitter = new EventEmitter();
    this.setupLogging();
  }

  /**
   * Emit an event to all registered listeners
   */
  emit(eventName: EventName, data: any, userId?: string): void {
    const payload: EventPayload = {
      eventName,
      data,
      timestamp: new Date(),
      userId
    };

    // Store in history for debugging
    this.addToHistory(payload);

    // Emit the event
    this.emitter.emit(eventName, payload);
    
    // Also emit to generic listeners
    this.emitter.emit('*', payload);
  }

  /**
   * Subscribe to a specific event
   */
  on(eventName: EventName | '*', callback: (payload: EventPayload) => void): void {
    this.emitter.on(eventName, callback);
  }

  /**
   * Subscribe to an event once
   */
  once(eventName: EventName | '*', callback: (payload: EventPayload) => void): void {
    this.emitter.once(eventName, callback);
  }

  /**
   * Unsubscribe from an event
   */
  off(eventName: EventName | '*', callback: (payload: EventPayload) => void): void {
    this.emitter.off(eventName, callback);
  }

  /**
   * Remove all listeners for an event
   */
  removeAllListeners(eventName?: EventName): void {
    this.emitter.removeAllListeners(eventName);
  }

  /**
   * Get list of all registered event names
   */
  getEventNames(): EventName[] {
    return this.emitter.eventNames() as EventName[];
  }

  /**
   * Get number of listeners for an event
   */
  getListenerCount(eventName: EventName): number {
    return this.emitter.listenerCount(eventName);
  }

  /**
   * Get recent event history
   */
  getEventHistory(limit?: number): EventPayload[] {
    const events = this.eventHistory.slice();
    return limit ? events.slice(-limit) : events;
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Get events filtered by type
   */
  getEventsByType(eventType: 'cart' | 'user' | 'order', limit?: number): EventPayload[] {
    const filtered = this.eventHistory.filter(event => {
      return event.eventName.startsWith(eventType);
    });
    
    return limit ? filtered.slice(-limit) : filtered;
  }

  /**
   * Get events for a specific user
   */
  getEventsByUser(userId: string, limit?: number): EventPayload[] {
    const filtered = this.eventHistory.filter(event => {
      return event.userId === userId;
    });
    
    return limit ? filtered.slice(-limit) : filtered;
  }

  // ========== Cart Event Helpers ==========

  emitCartItemAdded(data: { itemId: string; productId: string; quantity: number }, userId?: string): void {
    this.emit(CartEvents.ITEM_ADDED, data, userId);
  }

  emitCartItemRemoved(data: { itemId: string; productId: string }, userId?: string): void {
    this.emit(CartEvents.ITEM_REMOVED, data, userId);
  }

  emitCartQuantityChanged(data: { itemId: string; oldQuantity: number; newQuantity: number }, userId?: string): void {
    this.emit(CartEvents.QUANTITY_CHANGED, data, userId);
  }

  emitDiscountApplied(data: { discountId: string; amount: number; code?: string }, userId?: string): void {
    this.emit(CartEvents.DISCOUNT_APPLIED, data, userId);
  }

  emitCouponApplied(data: { code: string; discountAmount: number }, userId?: string): void {
    this.emit(CartEvents.COUPON_APPLIED, data, userId);
  }

  emitCheckoutStarted(data: { cartId: string; total: number; itemCount: number }, userId?: string): void {
    this.emit(CartEvents.CHECKOUT_STARTED, data, userId);
  }

  // ========== User Event Helpers ==========

  emitUserLogin(data: { userId: string; email: string }, userId?: string): void {
    this.emit(UserEvents.LOGIN, data, userId);
  }

  emitUserLogout(data: { userId: string }, userId?: string): void {
    this.emit(UserEvents.LOGOUT, data, userId);
  }

  emitUserRegister(data: { userId: string; email: string }, userId?: string): void {
    this.emit(UserEvents.REGISTER, data, userId);
  }

  // ========== Order Event Helpers ==========

  emitOrderCreated(data: { orderId: string; total: number; itemCount: number }, userId?: string): void {
    this.emit(OrderEvents.CREATED, data, userId);
  }

  emitOrderPaid(data: { orderId: string; paymentId: string; amount: number }, userId?: string): void {
    this.emit(OrderEvents.PAID, data, userId);
  }

  emitOrderShipped(data: { orderId: string; trackingNumber: string }, userId?: string): void {
    this.emit(OrderEvents.SHIPPED, data, userId);
  }

  emitOrderCompleted(data: { orderId: string; completedAt: Date }, userId?: string): void {
    this.emit(OrderEvents.COMPLETED, data, userId);
  }

  // ========== Private Methods ==========

  private addToHistory(payload: EventPayload): void {
    this.eventHistory.push(payload);
    
    // Keep history size manageable
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
    }
  }

  private setupLogging(): void {
    // Log all events in development mode
    if (process.env.NODE_ENV === 'development') {
      this.on('*', (payload) => {
        console.log(`[Plugin Event] ${payload.eventName}:`, payload.data);
      });
    }
  }
}

// Export singleton instance
export const eventManager = new PluginEventManager();