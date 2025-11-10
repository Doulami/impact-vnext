"use strict";
/**
 * Plugin System Event Manager
 *
 * Handles event emission and subscription for plugin system
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventManager = exports.PluginEventManager = void 0;
const eventemitter3_1 = require("eventemitter3");
const types_1 = require("./types");
class PluginEventManager {
    constructor() {
        this.eventHistory = [];
        this.maxHistorySize = 1000;
        this.emitter = new eventemitter3_1.EventEmitter();
        this.setupLogging();
    }
    /**
     * Emit an event to all registered listeners
     */
    emit(eventName, data, userId) {
        const payload = {
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
    on(eventName, callback) {
        this.emitter.on(eventName, callback);
    }
    /**
     * Subscribe to an event once
     */
    once(eventName, callback) {
        this.emitter.once(eventName, callback);
    }
    /**
     * Unsubscribe from an event
     */
    off(eventName, callback) {
        this.emitter.off(eventName, callback);
    }
    /**
     * Remove all listeners for an event
     */
    removeAllListeners(eventName) {
        this.emitter.removeAllListeners(eventName);
    }
    /**
     * Get list of all registered event names
     */
    getEventNames() {
        return this.emitter.eventNames();
    }
    /**
     * Get number of listeners for an event
     */
    getListenerCount(eventName) {
        return this.emitter.listenerCount(eventName);
    }
    /**
     * Get recent event history
     */
    getEventHistory(limit) {
        const events = this.eventHistory.slice();
        return limit ? events.slice(-limit) : events;
    }
    /**
     * Clear event history
     */
    clearHistory() {
        this.eventHistory = [];
    }
    /**
     * Get events filtered by type
     */
    getEventsByType(eventType, limit) {
        const filtered = this.eventHistory.filter(event => {
            return event.eventName.startsWith(eventType);
        });
        return limit ? filtered.slice(-limit) : filtered;
    }
    /**
     * Get events for a specific user
     */
    getEventsByUser(userId, limit) {
        const filtered = this.eventHistory.filter(event => {
            return event.userId === userId;
        });
        return limit ? filtered.slice(-limit) : filtered;
    }
    // ========== Cart Event Helpers ==========
    emitCartItemAdded(data, userId) {
        this.emit(types_1.CartEvents.ITEM_ADDED, data, userId);
    }
    emitCartItemRemoved(data, userId) {
        this.emit(types_1.CartEvents.ITEM_REMOVED, data, userId);
    }
    emitCartQuantityChanged(data, userId) {
        this.emit(types_1.CartEvents.QUANTITY_CHANGED, data, userId);
    }
    emitDiscountApplied(data, userId) {
        this.emit(types_1.CartEvents.DISCOUNT_APPLIED, data, userId);
    }
    emitCouponApplied(data, userId) {
        this.emit(types_1.CartEvents.COUPON_APPLIED, data, userId);
    }
    emitCheckoutStarted(data, userId) {
        this.emit(types_1.CartEvents.CHECKOUT_STARTED, data, userId);
    }
    // ========== User Event Helpers ==========
    emitUserLogin(data, userId) {
        this.emit(types_1.UserEvents.LOGIN, data, userId);
    }
    emitUserLogout(data, userId) {
        this.emit(types_1.UserEvents.LOGOUT, data, userId);
    }
    emitUserRegister(data, userId) {
        this.emit(types_1.UserEvents.REGISTER, data, userId);
    }
    // ========== Order Event Helpers ==========
    emitOrderCreated(data, userId) {
        this.emit(types_1.OrderEvents.CREATED, data, userId);
    }
    emitOrderPaid(data, userId) {
        this.emit(types_1.OrderEvents.PAID, data, userId);
    }
    emitOrderShipped(data, userId) {
        this.emit(types_1.OrderEvents.SHIPPED, data, userId);
    }
    emitOrderCompleted(data, userId) {
        this.emit(types_1.OrderEvents.COMPLETED, data, userId);
    }
    // ========== Private Methods ==========
    addToHistory(payload) {
        this.eventHistory.push(payload);
        // Keep history size manageable
        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
        }
    }
    setupLogging() {
        // Log all events in development mode
        if (process.env.NODE_ENV === 'development') {
            this.on('*', (payload) => {
                console.log(`[Plugin Event] ${payload.eventName}:`, payload.data);
            });
        }
    }
}
exports.PluginEventManager = PluginEventManager;
// Export singleton instance
exports.eventManager = new PluginEventManager();
//# sourceMappingURL=events.js.map