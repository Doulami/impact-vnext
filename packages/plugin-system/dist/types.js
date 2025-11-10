"use strict";
/**
 * Plugin System Type Definitions
 *
 * Core types for the Impact Nutrition plugin architecture
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderEvents = exports.UserEvents = exports.CartEvents = void 0;
// ========== Event System Types ==========
var CartEvents;
(function (CartEvents) {
    CartEvents["ITEM_ADDED"] = "cart.item_added";
    CartEvents["ITEM_REMOVED"] = "cart.item_removed";
    CartEvents["ITEM_UPDATED"] = "cart.item_updated";
    CartEvents["QUANTITY_CHANGED"] = "cart.quantity_changed";
    CartEvents["DISCOUNT_APPLIED"] = "cart.discount_applied";
    CartEvents["DISCOUNT_REMOVED"] = "cart.discount_removed";
    CartEvents["COUPON_APPLIED"] = "cart.coupon_applied";
    CartEvents["CHECKOUT_STARTED"] = "cart.checkout_started";
    CartEvents["CART_CLEARED"] = "cart.cleared";
})(CartEvents || (exports.CartEvents = CartEvents = {}));
var UserEvents;
(function (UserEvents) {
    UserEvents["LOGIN"] = "user.login";
    UserEvents["LOGOUT"] = "user.logout";
    UserEvents["REGISTER"] = "user.register";
    UserEvents["PROFILE_UPDATED"] = "user.profile_updated";
    UserEvents["PASSWORD_CHANGED"] = "user.password_changed";
})(UserEvents || (exports.UserEvents = UserEvents = {}));
var OrderEvents;
(function (OrderEvents) {
    OrderEvents["CREATED"] = "order.created";
    OrderEvents["UPDATED"] = "order.updated";
    OrderEvents["PAID"] = "order.paid";
    OrderEvents["SHIPPED"] = "order.shipped";
    OrderEvents["DELIVERED"] = "order.delivered";
    OrderEvents["COMPLETED"] = "order.completed";
    OrderEvents["CANCELLED"] = "order.cancelled";
    OrderEvents["REFUNDED"] = "order.refunded";
})(OrderEvents || (exports.OrderEvents = OrderEvents = {}));
//# sourceMappingURL=types.js.map