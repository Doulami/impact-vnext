import { gql } from '@apollo/client';

// Get active order
export const GET_ACTIVE_ORDER = gql`
  query GetActiveOrder {
    activeOrder {
      id
      code
      state
      total
      totalWithTax
      subTotalWithTax
      currencyCode
      couponCodes
      discounts {
        description
        amountWithTax
      }
      lines {
        id
        quantity
        linePrice
        linePriceWithTax
        productVariant {
          id
          name
          sku
        }
        featuredAsset {
          id
          preview
        }
      }
      shippingAddress {
        fullName
        streetLine1
        streetLine2
        city
        province
        postalCode
        country
        phoneNumber
      }
      billingAddress {
        fullName
        streetLine1
        streetLine2
        city
        province
        postalCode
        country
        phoneNumber
      }
      shippingLines {
        id
        shippingMethod {
          id
          name
          description
        }
        priceWithTax
      }
    }
  }
`;

// Get active order state only (lightweight query for checking state)
export const GET_ACTIVE_ORDER_STATE = gql`
  query GetActiveOrderState {
    activeOrder {
      id
      code
      state
      lines {
        id
      }
    }
  }
`;

// Add item to order
export const ADD_ITEM_TO_ORDER = gql`
  mutation AddItemToOrder($productVariantId: ID!, $quantity: Int!) {
    addItemToOrder(productVariantId: $productVariantId, quantity: $quantity) {
      ... on Order {
        id
        code
        total
        totalWithTax
        lines {
          id
          quantity
          productVariant {
            id
            name
          }
        }
      }
      ... on OrderModificationError {
        errorCode
        message
      }
      ... on OrderLimitError {
        errorCode
        message
      }
      ... on NegativeQuantityError {
        errorCode
        message
      }
      ... on InsufficientStockError {
        errorCode
        message
      }
    }
  }
`;

// Adjust order line
export const ADJUST_ORDER_LINE = gql`
  mutation AdjustOrderLine($orderLineId: ID!, $quantity: Int!) {
    adjustOrderLine(orderLineId: $orderLineId, quantity: $quantity) {
      ... on Order {
        id
        code
        total
        totalWithTax
        lines {
          id
          quantity
        }
      }
      ... on OrderModificationError {
        errorCode
        message
      }
    }
  }
`;

// Remove order line
export const REMOVE_ORDER_LINE = gql`
  mutation RemoveOrderLine($orderLineId: ID!) {
    removeOrderLine(orderLineId: $orderLineId) {
      ... on Order {
        id
        code
        total
        totalWithTax
        lines {
          id
          quantity
        }
      }
      ... on OrderModificationError {
        errorCode
        message
      }
    }
  }
`;

// Set shipping address
export const SET_ORDER_SHIPPING_ADDRESS = gql`
  mutation SetOrderShippingAddress($input: CreateAddressInput!) {
    setOrderShippingAddress(input: $input) {
      ... on Order {
        id
        shippingAddress {
          fullName
          streetLine1
          streetLine2
          city
          province
          postalCode
          country
          phoneNumber
        }
      }
      ... on NoActiveOrderError {
        errorCode
        message
      }
    }
  }
`;

// Set billing address
export const SET_ORDER_BILLING_ADDRESS = gql`
  mutation SetOrderBillingAddress($input: CreateAddressInput!) {
    setOrderBillingAddress(input: $input) {
      ... on Order {
        id
        billingAddress {
          fullName
          streetLine1
          streetLine2
          city
          province
          postalCode
          country
          phoneNumber
        }
      }
      ... on NoActiveOrderError {
        errorCode
        message
      }
    }
  }
`;

// Get eligible shipping methods
export const GET_ELIGIBLE_SHIPPING_METHODS = gql`
  query GetEligibleShippingMethods {
    eligibleShippingMethods {
      id
      name
      description
      priceWithTax
      metadata
    }
  }
`;

// Set shipping method
export const SET_ORDER_SHIPPING_METHOD = gql`
  mutation SetOrderShippingMethod($shippingMethodId: [ID!]!) {
    setOrderShippingMethod(shippingMethodId: $shippingMethodId) {
      ... on Order {
        id
        shippingLines {
          id
          shippingMethod {
            id
            name
          }
          priceWithTax
        }
      }
      ... on OrderModificationError {
        errorCode
        message
      }
      ... on IneligibleShippingMethodError {
        errorCode
        message
      }
      ... on NoActiveOrderError {
        errorCode
        message
      }
    }
  }
`;

// Get eligible payment methods
export const GET_ELIGIBLE_PAYMENT_METHODS = gql`
  query GetEligiblePaymentMethods {
    eligiblePaymentMethods {
      id
      code
      name
      description
      isEligible
      eligibilityMessage
    }
  }
`;

// Transition to ArrangingPayment
export const TRANSITION_TO_ARRANGING_PAYMENT = gql`
  mutation TransitionToArrangingPayment {
    transitionOrderToState(state: "ArrangingPayment") {
      ... on Order {
        id
        state
      }
      ... on OrderStateTransitionError {
        errorCode
        message
        transitionError
        fromState
        toState
      }
    }
  }
`;

// Add payment to order
export const ADD_PAYMENT_TO_ORDER = gql`
  mutation AddPaymentToOrder($input: PaymentInput!) {
    addPaymentToOrder(input: $input) {
      ... on Order {
        id
        code
        state
        total
        totalWithTax
        payments {
          id
          method
          amount
          state
        }
      }
      ... on OrderPaymentStateError {
        errorCode
        message
      }
      ... on IneligiblePaymentMethodError {
        errorCode
        message
      }
      ... on PaymentFailedError {
        errorCode
        message
        paymentErrorMessage
      }
      ... on PaymentDeclinedError {
        errorCode
        message
        paymentErrorMessage
      }
      ... on OrderStateTransitionError {
        errorCode
        message
      }
      ... on NoActiveOrderError {
        errorCode
        message
      }
    }
  }
`;

// Coupon code mutations
export const APPLY_COUPON_CODE = gql`
  mutation ApplyCouponCode($couponCode: String!) {
    applyCouponCode(couponCode: $couponCode) {
      ... on Order {
        id
        code
        couponCodes
        discounts {
          description
          amountWithTax
        }
        subTotalWithTax
        totalWithTax
      }
      ... on CouponCodeInvalidError {
        errorCode
        message
        couponCode
      }
      ... on CouponCodeExpiredError {
        errorCode
        message
        couponCode
      }
      ... on CouponCodeLimitError {
        errorCode
        message
        couponCode
        limit
      }
    }
  }
`;

export const REMOVE_COUPON_CODE = gql`
  mutation RemoveCouponCode($couponCode: String!) {
    removeCouponCode(couponCode: $couponCode) {
      ... on Order {
        id
        code
        couponCodes
        discounts {
          description
          amountWithTax
        }
        subTotalWithTax
        totalWithTax
      }
    }
  }
`;

// Bundle Plugin v2 mutations
// Bundles explode into header line (shell) + child lines (components) at checkout

export const ADD_BUNDLE_TO_ORDER = gql`
  mutation AddBundleToOrder($bundleId: ID!, $quantity: Int!) {
    addBundleToOrder(bundleId: $bundleId, quantity: $quantity) {
      id
      code
      total
      totalWithTax
      lines {
        id
        quantity
        linePrice
        linePriceWithTax
        productVariant {
          id
          name
        }
      }
    }
  }
`;

// Get order by code (for order confirmation)
// Get available countries
export const GET_AVAILABLE_COUNTRIES = gql`
  query GetAvailableCountries {
    availableCountries {
      id
      code
      name
    }
  }
`;

export const GET_ORDER_FOR_CHECKOUT = gql`
  query GetOrderForCheckout($code: String!) {
    orderByCode(code: $code) {
      id
      code
      state
      orderPlacedAt
      total
      totalWithTax
      subTotalWithTax
      couponCodes
      discounts {
        description
        amountWithTax
      }
      currencyCode
      customer {
        firstName
        lastName
        emailAddress
      }
      lines {
        id
        quantity
        linePrice
        linePriceWithTax
        discountedLinePriceWithTax
        productVariant {
          id
          name
          sku
          product {
            id
            name
            slug
          }
        }
        featuredAsset {
          id
          preview
        }
        customFields {
          bundleKey
          bundleId
          bundleName
          isBundleHeader
          bundleComponentQty
        }
      }
      shippingAddress {
        fullName
        streetLine1
        streetLine2
        city
        province
        postalCode
        country
        phoneNumber
      }
      billingAddress {
        fullName
        streetLine1
        streetLine2
        city
        province
        postalCode
        country
        phoneNumber
      }
      shippingLines {
        shippingMethod {
          name
          description
        }
        priceWithTax
      }
      payments {
        method
        amount
        state
      }
    }
  }
`;

// ClicToPay payment mutations
export const CREATE_CLICTOPAY_PAYMENT = gql`
  mutation CreateClicToPayPayment($input: PaymentInput!) {
    addPaymentToOrder(input: $input) {
      ... on Order {
        id
        code
        state
        total
        totalWithTax
        payments {
          id
          method
          amount
          state
          metadata
        }
      }
      ... on OrderPaymentStateError {
        errorCode
        message
      }
      ... on IneligiblePaymentMethodError {
        errorCode
        message
      }
      ... on PaymentFailedError {
        errorCode
        message
        paymentErrorMessage
      }
      ... on PaymentDeclinedError {
        errorCode
        message
        paymentErrorMessage
      }
      ... on OrderStateTransitionError {
        errorCode
        message
      }
      ... on NoActiveOrderError {
        errorCode
        message
      }
    }
  }
`;

export const CHECK_CLICTOPAY_PAYMENT_STATUS = gql`
  query CheckClicToPayPaymentStatus($orderId: String!) {
    checkPaymentStatus(orderId: $orderId) {
      status
      orderCode
      transactionId
      amount
      currency
      message
    }
  }
`;
