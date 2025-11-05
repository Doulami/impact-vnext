import { gql } from '@apollo/client';

// Customer authentication mutations
export const REGISTER_CUSTOMER = gql`
  mutation RegisterCustomer($input: RegisterCustomerInput!) {
    registerCustomerAccount(input: $input) {
      ... on Success {
        success
      }
      ... on MissingPasswordError {
        message
      }
      ... on PasswordValidationError {
        message
      }
      ... on NativeAuthStrategyError {
        message
      }
      ... on ErrorResult {
        message
      }
    }
  }
`;

export const AUTHENTICATE = gql`
  mutation Authenticate($username: String!, $password: String!, $rememberMe: Boolean) {
    authenticate(input: { native: { username: $username, password: $password } }, rememberMe: $rememberMe) {
      ... on CurrentUser {
        id
        identifier
        channels {
          id
          code
          token
        }
      }
      ... on InvalidCredentialsError {
        message
      }
      ... on NotVerifiedError {
        message
      }
      ... on ErrorResult {
        message
      }
    }
  }
`;

export const LOGOUT = gql`
  mutation Logout {
    logout {
      success
    }
  }
`;

export const REFRESH_CUSTOMER_VERIFICATION = gql`
  mutation RefreshCustomerVerification($emailAddress: String!) {
    refreshCustomerVerification(emailAddress: $emailAddress) {
      ... on Success {
        success
      }
      ... on NativeAuthStrategyError {
        message
      }
      ... on ErrorResult {
        message
      }
    }
  }
`;

export const VERIFY_CUSTOMER_ACCOUNT = gql`
  mutation VerifyCustomerAccount($token: String!, $password: String) {
    verifyCustomerAccount(token: $token, password: $password) {
      ... on CurrentUser {
        id
        identifier
      }
      ... on VerificationTokenInvalidError {
        message
      }
      ... on VerificationTokenExpiredError {
        message
      }
      ... on PasswordValidationError {
        message
      }
      ... on PasswordAlreadySetError {
        message
      }
      ... on MissingPasswordError {
        message
      }
      ... on NativeAuthStrategyError {
        message
      }
      ... on ErrorResult {
        message
      }
    }
  }
`;

export const REQUEST_PASSWORD_RESET = gql`
  mutation RequestPasswordReset($emailAddress: String!) {
    requestPasswordReset(emailAddress: $emailAddress) {
      ... on Success {
        success
      }
      ... on NativeAuthStrategyError {
        message
      }
      ... on ErrorResult {
        message
      }
    }
  }
`;

export const RESET_PASSWORD = gql`
  mutation ResetPassword($token: String!, $password: String!) {
    resetPassword(token: $token, password: $password) {
      ... on CurrentUser {
        id
        identifier
      }
      ... on PasswordResetTokenInvalidError {
        message
      }
      ... on PasswordResetTokenExpiredError {
        message
      }
      ... on PasswordValidationError {
        message
      }
      ... on NativeAuthStrategyError {
        message
      }
      ... on NotVerifiedError {
        message
      }
      ... on ErrorResult {
        message
      }
    }
  }
`;

export const UPDATE_CUSTOMER = gql`
  mutation UpdateCustomer($input: UpdateCustomerInput!) {
    updateCustomer(input: $input) {
      ... on Customer {
        id
        title
        firstName
        lastName
        emailAddress
        phoneNumber
        user {
          id
          verified
          lastLogin
        }
        addresses {
          id
          fullName
          company
          streetLine1
          streetLine2
          city
          province
          postalCode
          country {
            id
            code
            name
          }
          phoneNumber
          defaultShippingAddress
          defaultBillingAddress
        }
      }
      ... on ErrorResult {
        message
      }
    }
  }
`;

export const UPDATE_CUSTOMER_PASSWORD = gql`
  mutation UpdateCustomerPassword($currentPassword: String!, $newPassword: String!) {
    updateCustomerPassword(currentPassword: $currentPassword, newPassword: $newPassword) {
      ... on Success {
        success
      }
      ... on InvalidCredentialsError {
        message
      }
      ... on PasswordValidationError {
        message
      }
      ... on NativeAuthStrategyError {
        message
      }
      ... on ErrorResult {
        message
      }
    }
  }
`;

export const CREATE_CUSTOMER_ADDRESS = gql`
  mutation CreateCustomerAddress($input: CreateAddressInput!) {
    createCustomerAddress(input: $input) {
      id
      fullName
      company
      streetLine1
      streetLine2
      city
      province
      postalCode
      country {
        id
        code
        name
      }
      phoneNumber
      defaultShippingAddress
      defaultBillingAddress
    }
  }
`;

export const UPDATE_CUSTOMER_ADDRESS = gql`
  mutation UpdateCustomerAddress($input: UpdateAddressInput!) {
    updateCustomerAddress(input: $input) {
      id
      fullName
      company
      streetLine1
      streetLine2
      city
      province
      postalCode
      country {
        id
        code
        name
      }
      phoneNumber
      defaultShippingAddress
      defaultBillingAddress
    }
  }
`;

export const DELETE_CUSTOMER_ADDRESS = gql`
  mutation DeleteCustomerAddress($id: ID!) {
    deleteCustomerAddress(id: $id) {
      success
    }
  }
`;

// Customer queries
export const GET_ACTIVE_CUSTOMER = gql`
  query GetActiveCustomer {
    activeCustomer {
      id
      title
      firstName
      lastName
      emailAddress
      phoneNumber
      user {
        id
        verified
        lastLogin
      }
      addresses {
        id
        fullName
        company
        streetLine1
        streetLine2
        city
        province
        postalCode
        country {
          id
          code
          name
        }
        phoneNumber
        defaultShippingAddress
        defaultBillingAddress
      }
    }
  }
`;

export const GET_CUSTOMER_ORDERS = gql`
  query GetCustomerOrders($options: OrderListOptions) {
    activeCustomer {
      orders(options: $options) {
        items {
          id
          code
          state
          orderPlacedAt
          updatedAt
          total
          totalWithTax
          currencyCode
          lines {
            id
            quantity
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
        }
        totalItems
      }
    }
  }
`;

export const GET_ORDER_BY_CODE = gql`
  query GetOrderByCode($code: String!) {
    orderByCode(code: $code) {
      id
      code
      state
      orderPlacedAt
      updatedAt
      total
      totalWithTax
      currencyCode
      customer {
        id
        firstName
        lastName
        emailAddress
      }
      shippingAddress {
        fullName
        company
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
        company
        streetLine1
        streetLine2
        city
        province
        postalCode
        country
        phoneNumber
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
          options {
            id
            name
            value
          }
        }
        featuredAsset {
          id
          preview
        }
      }
      shippingLines {
        id
        shippingMethod {
          id
          name
          description
        }
        price
        priceWithTax
      }
      payments {
        id
        method
        amount
        state
        transactionId
        createdAt
      }
    }
  }
`;

export const GET_AVAILABLE_COUNTRIES = gql`
  query GetAvailableCountries {
    availableCountries {
      id
      code
      name
    }
  }
`;