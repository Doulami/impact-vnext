// Authentication types for Vendure Shop API

export interface User {
  id: string;
  identifier: string;
  verified: boolean;
  lastLogin?: string;
  channels?: Channel[];
}

export interface Channel {
  id: string;
  code: string;
  token: string;
}

export interface Customer {
  id: string;
  title?: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
  phoneNumber?: string;
  user?: User;
  addresses?: Address[];
}

export interface Address {
  id: string;
  fullName?: string;
  company?: string;
  streetLine1: string;
  streetLine2?: string;
  city: string;
  province: string;
  postalCode: string;
  country: Country;
  phoneNumber?: string;
  defaultShippingAddress?: boolean;
  defaultBillingAddress?: boolean;
}

export interface Country {
  id: string;
  code: string;
  name: string;
}

export interface Order {
  id: string;
  code: string;
  state: string;
  orderPlacedAt?: string;
  updatedAt: string;
  total: number;
  totalWithTax: number;
  currencyCode: string;
  lines: OrderLine[];
  customer?: OrderCustomer;
  shippingAddress?: OrderAddress;
  billingAddress?: OrderAddress;
  shippingLines?: ShippingLine[];
  payments?: Payment[];
}

export interface OrderLine {
  id: string;
  quantity: number;
  linePrice?: number;
  linePriceWithTax?: number;
  productVariant: {
    id: string;
    name: string;
    sku: string;
    options?: Array<{
      id: string;
      name: string;
      value: string;
    }>;
  };
  featuredAsset?: {
    id: string;
    preview: string;
  };
}

export interface OrderCustomer {
  id: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
}

export interface OrderAddress {
  fullName?: string;
  company?: string;
  streetLine1: string;
  streetLine2?: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  phoneNumber?: string;
}

export interface ShippingLine {
  id: string;
  shippingMethod: {
    id: string;
    name: string;
    description: string;
  };
  price: number;
  priceWithTax: number;
}

export interface Payment {
  id: string;
  method: string;
  amount: number;
  state: string;
  transactionId?: string;
  createdAt: string;
}

// Form input types
export interface LoginInput {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterInput {
  title?: string;
  firstName: string;
  lastName: string;
  emailAddress: string;
  password: string;
  phoneNumber?: string;
}

export interface UpdateCustomerInput {
  title?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}

export interface UpdatePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface CreateAddressInput {
  fullName?: string;
  company?: string;
  streetLine1: string;
  streetLine2?: string;
  city: string;
  province: string;
  postalCode: string;
  countryCode: string;
  phoneNumber?: string;
  defaultShippingAddress?: boolean;
  defaultBillingAddress?: boolean;
}

export interface UpdateAddressInput {
  id: string;
  fullName?: string;
  company?: string;
  streetLine1?: string;
  streetLine2?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  countryCode?: string;
  phoneNumber?: string;
  defaultShippingAddress?: boolean;
  defaultBillingAddress?: boolean;
}

// Authentication state
export interface AuthState {
  user: User | null;
  customer: Customer | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// API response types
export interface AuthResponse {
  success?: boolean;
  user?: User;
  customer?: Customer;
  message?: string;
}

export interface RegisterResponse {
  success: boolean;
  message?: string;
}

export interface VerifyAccountResponse {
  user?: User;
  message?: string;
}

export interface PasswordResetResponse {
  success?: boolean;
  user?: User;
  message?: string;
}

// Error types
export interface AuthError {
  message: string;
  code?: string;
}

export type AuthErrorType = 
  | 'INVALID_CREDENTIALS'
  | 'NOT_VERIFIED' 
  | 'PASSWORD_VALIDATION'
  | 'MISSING_PASSWORD'
  | 'VERIFICATION_TOKEN_INVALID'
  | 'VERIFICATION_TOKEN_EXPIRED'
  | 'PASSWORD_RESET_TOKEN_INVALID'
  | 'PASSWORD_RESET_TOKEN_EXPIRED'
  | 'NATIVE_AUTH_STRATEGY_ERROR'
  | 'UNKNOWN_ERROR';

// Utility types
export interface PaginatedOrders {
  items: Order[];
  totalItems: number;
}

export interface OrderListOptions {
  take?: number;
  skip?: number;
}