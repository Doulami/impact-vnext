'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import { useCart } from '@/lib/hooks/useCart';
import { useMutation, useQuery, useLazyQuery } from '@apollo/client/react';
import {
  ADD_ITEM_TO_ORDER,
  ADD_BUNDLE_TO_ORDER,
  SET_ORDER_SHIPPING_ADDRESS,
  SET_ORDER_SHIPPING_METHOD,
  GET_ELIGIBLE_SHIPPING_METHODS,
  GET_ELIGIBLE_PAYMENT_METHODS,
  TRANSITION_TO_ARRANGING_PAYMENT,
  ADD_PAYMENT_TO_ORDER,
  GET_ACTIVE_ORDER_STATE,
  GET_ACTIVE_ORDER,
  REMOVE_ORDER_LINE,
  GET_AVAILABLE_COUNTRIES
} from '@/lib/graphql/checkout';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Button from '@/components/Button';
import BundleCard from '@/components/BundleCard';
import CouponCodeInput from '@/components/CouponCodeInput';
import RewardPointsRedemption from '@/components/RewardPointsRedemption';
import { CheckCircle, AlertCircle, ShoppingCart } from 'lucide-react';
import PaymentMethodCard from '@/components/payment/PaymentMethodCard';
import PaymentActionButton from '@/components/payment/PaymentActionButton';
import { usePaymentProcessor } from '@/lib/hooks/usePaymentProcessor';
import { PaymentMethod } from '@/lib/utils/payment-methods';

function CheckoutPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: authLoading, customer } = useAuth();
  const { items, totalPrice, clearCart } = useCart();
  
  const currentStep = parseInt(searchParams.get('step') || '1', 10);
  const [orderCreated, setOrderCreated] = useState(false);
  const [orderCode, setOrderCode] = useState('');
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [orderCompleted, setOrderCompleted] = useState(false);
  const [pointsRedeemed, setPointsRedeemed] = useState(0);
  const [pointsDiscount, setPointsDiscount] = useState(0);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>(''); // Will be set dynamically

  const [shippingForm, setShippingForm] = useState({
    fullName: '',
    streetLine1: '',
    streetLine2: '',
    city: '',
    province: '',
    postalCode: '',
    countryCode: '',
    phoneNumber: ''
  });

  // GraphQL queries and mutations
  const [getActiveOrderState] = useLazyQuery<{
    activeOrder?: {
      id: string;
      code: string;
      state: string;
      lines: Array<{ id: string }>;
    };
  }>(GET_ACTIVE_ORDER_STATE);
  const [addItemToOrder] = useMutation(ADD_ITEM_TO_ORDER);
  const [addBundleToOrder] = useMutation(ADD_BUNDLE_TO_ORDER);
  const [removeOrderLine] = useMutation(REMOVE_ORDER_LINE);
  const [setShippingAddress] = useMutation(SET_ORDER_SHIPPING_ADDRESS);
  const [setShippingMethod] = useMutation(SET_ORDER_SHIPPING_METHOD);
  const [transitionToPayment] = useMutation(TRANSITION_TO_ARRANGING_PAYMENT);
  const [addPayment] = useMutation(ADD_PAYMENT_TO_ORDER);
  
  // Payment processor for dynamic payment handling
  const paymentProcessor = usePaymentProcessor();

  const { data: shippingMethodsData, loading: shippingMethodsLoading, error: shippingMethodsError } = useQuery(GET_ELIGIBLE_SHIPPING_METHODS, {
    skip: currentStep !== 2
  });

  const { data: activeOrderData, refetch: refetchActiveOrder } = useQuery<{
    activeOrder?: {
      id: string;
      code: string;
      state: string;
      total: number;
      totalWithTax: number;
      subTotalWithTax: number;
      couponCodes: string[];
      discounts: Array<{
        description: string;
        amountWithTax: number;
      }>;
      currencyCode: string;
      lines: Array<{
        id: string;
        quantity: number;
        linePrice: number;
        linePriceWithTax: number;
        productVariant: {
          id: string;
          name: string;
          sku: string;
        };
        featuredAsset?: {
          id: string;
          preview: string;
        };
      }>;
      shippingAddress?: {
        fullName: string;
        streetLine1: string;
        streetLine2?: string;
        city: string;
        province: string;
        postalCode: string;
        country: string;
        phoneNumber?: string;
      };
      billingAddress?: {
        fullName: string;
        streetLine1: string;
        streetLine2?: string;
        city: string;
        province: string;
        postalCode: string;
        country: string;
        phoneNumber?: string;
      };
      shippingLines: Array<{
        id: string;
        shippingMethod: {
          id: string;
          name: string;
          description: string;
        };
        priceWithTax: number;
      }>;
    };
  }>(GET_ACTIVE_ORDER, {
    skip: currentStep !== 3
  });
  
  const { data: countriesData, loading: countriesLoading } = useQuery<{
    availableCountries: Array<{
      id: string;
      code: string;
      name: string;
    }>;
  }>(GET_AVAILABLE_COUNTRIES, {
    skip: currentStep !== 1
  });

  // Debug payment methods availability
  const { data: paymentMethodsData, loading: paymentMethodsLoading, error: paymentMethodsError } = useQuery<{
    eligiblePaymentMethods: Array<{
      id: string;
      code: string;
      name: string;
      description: string;
      isEligible: boolean;
      eligibilityMessage?: string;
    }>;
  }>(GET_ELIGIBLE_PAYMENT_METHODS, {
    skip: currentStep !== 3,
    fetchPolicy: 'cache-and-network', // Always check for updates
    errorPolicy: 'all',
  });
  
  // Handle payment methods data when it loads
  useEffect(() => {
    if (paymentMethodsData?.eligiblePaymentMethods) {
      console.log('Available payment methods:', paymentMethodsData.eligiblePaymentMethods);
      
      // Reset selected payment method if it's no longer available
      if (selectedPaymentMethod && !paymentMethodsData.eligiblePaymentMethods.find(method => method.code === selectedPaymentMethod)) {
        console.log(`Previously selected payment method '${selectedPaymentMethod}' is no longer available, resetting selection`);
        setSelectedPaymentMethod('');
      }
      
      // Set default payment method if none selected
      if (!selectedPaymentMethod && paymentMethodsData.eligiblePaymentMethods.length > 0) {
        const defaultMethod = paymentMethodsData.eligiblePaymentMethods.find(method => method.isEligible) || paymentMethodsData.eligiblePaymentMethods[0];
        if (defaultMethod) {
          console.log(`Setting default payment method to: ${defaultMethod.code}`);
          setSelectedPaymentMethod(defaultMethod.code);
        }
      }
    }
  }, [paymentMethodsData, selectedPaymentMethod]);
  
  // Handle payment methods errors
  useEffect(() => {
    if (paymentMethodsError) {
      console.error('Payment methods query error:', paymentMethodsError);
    }
  }, [paymentMethodsError]);

  const [selectedShippingMethod, setSelectedShippingMethod] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/checkout');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && items.length === 0 && !orderCompleted) {
      router.push('/cart');
    }
  }, [isAuthenticated, authLoading, items.length, router, orderCompleted]);

  useEffect(() => {
    if (customer) {
      setShippingForm(prev => ({
        ...prev,
        fullName: `${customer.firstName} ${customer.lastName}`,
        phoneNumber: customer.phoneNumber || ''
      }));
    }
  }, [customer]);
  
  // Set default country when countries data loads
  useEffect(() => {
    if (countriesData?.availableCountries && shippingForm.countryCode === '') {
      // Find a common default country (try TN, US, CA, or first available country)
      const availableCountries = countriesData.availableCountries;
      const defaultCountry = availableCountries.find((c: any) => ['TN', 'US', 'CA', 'GB', 'FR', 'DE'].includes(c.code)) || availableCountries[0];
      
      if (defaultCountry) {
        setShippingForm(prev => ({
          ...prev,
          countryCode: defaultCountry.code
        }));
      }
    }
  }, [countriesData, shippingForm.countryCode]);

  if (authLoading || !isAuthenticated || (items.length === 0 && !orderCompleted)) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--brand-primary)]"></div>
        </div>
        <Footer />
      </div>
    );
  }

  const handleShippingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setProcessing(true);

    try {
      // Step 1: Check for existing active order and clear it if needed
      if (!orderCreated) {
        console.log('Checking for existing active order...');
        const { data: orderStateData } = await getActiveOrderState();
        const activeOrder = orderStateData?.activeOrder;
        
        if (activeOrder) {
          console.log('Found active order:', activeOrder.code, 'State:', activeOrder.state);
          
          // If order exists and has lines, clear them to start fresh
          if (activeOrder.lines && activeOrder.lines.length > 0) {
            console.log(`Clearing ${activeOrder.lines.length} existing order lines...`);
            for (const line of activeOrder.lines) {
              try {
                await removeOrderLine({
                  variables: { orderLineId: line.id }
                });
                console.log('Removed order line:', line.id);
              } catch (removeError) {
                console.error('Error removing order line:', removeError);
                // Continue trying to remove other lines
              }
            }
            console.log('Existing order lines cleared successfully');
          }
        } else {
          console.log('No active order found, will create new one');
        }
        
        // Step 2: Add items to Vendure order
        console.log('Adding items to order:', items);
        
        // Add items one by one and handle errors
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          try {
            if (item.isBundle && item.bundleId) {
              // For bundles, use the new Bundle Plugin v2 addBundleToOrder mutation
              console.log(`Adding bundle ${item.bundleId} quantity ${item.quantity}`);
              const result = await addBundleToOrder({
                variables: {
                  bundleId: item.bundleId,
                  quantity: item.quantity
                }
              });
              console.log('Bundle add result:', result);
            } else {
              // For regular products, add normally
              console.log(`Adding product variant ${item.variantId} quantity ${item.quantity}`);
              const result = await addItemToOrder({
                variables: {
                  productVariantId: item.variantId,
                  quantity: item.quantity
                }
              });
              console.log('Product add result:', result);
            }
          } catch (itemError: any) {
            console.error(`Failed to add item ${i + 1}:`, itemError);
            throw new Error(
              `Failed to add item "${item.productName}" to order: ${itemError.message || 'Unknown error'}`
            );
          }
        }
        setOrderCreated(true);
      } else {
        console.log('Order already created, skipping item addition');
      }

      // Step 2: Set shipping address
      await setShippingAddress({
        variables: {
          input: {
            fullName: shippingForm.fullName,
            streetLine1: shippingForm.streetLine1,
            streetLine2: shippingForm.streetLine2 || undefined,
            city: shippingForm.city,
            province: shippingForm.province,
            postalCode: shippingForm.postalCode,
            countryCode: shippingForm.countryCode,
            phoneNumber: shippingForm.phoneNumber || undefined
          }
        }
      });

      router.push('/checkout?step=2');
    } catch (err: any) {
      console.error('Shipping error:', err);
      setError(err.message || 'Failed to process shipping information');
    } finally {
      setProcessing(false);
    }
  };

  const handleShippingMethodSubmit = async () => {
    if (!selectedShippingMethod) {
      setError('Please select a shipping method');
      return;
    }

    setError('');
    setProcessing(true);

    try {
      await setShippingMethod({
        variables: {
          shippingMethodId: [selectedShippingMethod]
        }
      });

      router.push('/checkout?step=3');
    } catch (err: any) {
      console.error('Shipping method error:', err);
      setError(err.message || 'Failed to set shipping method');
    } finally {
      setProcessing(false);
    }
  };

  const handlePaymentSubmit = async (methodCode?: string) => {
    const paymentMethod = methodCode || selectedPaymentMethod;
    if (!paymentMethod) {
      setError('Please select a payment method');
      return;
    }

    setError('');
    setProcessing(true);

    try {
      const orderTotal = (() => {
        const selectedMethod = shippingMethods.find((m: any) => m.id === selectedShippingMethod);
        const shippingCost = selectedMethod?.priceWithTax || 0;
        return activeOrderData?.activeOrder?.totalWithTax || (totalPrice + shippingCost);
      })();

      console.log(`Processing payment with method: ${paymentMethod}, amount: ${orderTotal}`);

      const result = await paymentProcessor.processPayment(paymentMethod, orderTotal);

      if (result.success) {
        if (result.requiresRedirect && result.redirectUrl) {
          // Handle redirect-based payments
          console.log('Redirecting to payment gateway:', result.redirectUrl);
          setOrderCompleted(true);
          paymentProcessor.handleRedirect(result.redirectUrl);
        } else {
          // Handle instant payments
          console.log('Payment completed successfully:', result.orderId);
          setOrderCompleted(true);
          clearCart();
          router.push(`/thank-you?order=${result.orderId}`);
        }
      } else {
        throw new Error(result.error || 'Payment processing failed');
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      const errorMessage = err.message || 'Failed to process payment';
      setError(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  const handleClicToPayPaymentInitiated = (orderId: string, transactionId?: string) => {
    console.log('ClicToPay payment initiated:', { orderId, transactionId });
    setOrderCompleted(true); // Mark as completed to prevent cart redirect during payment process
    // Note: Cart will be cleared by the success page after payment verification
  };

  const handleClicToPayError = (error: string) => {
    console.error('ClicToPay error:', error);
    setError(error);
  };

  const shippingMethods = (shippingMethodsData as any)?.eligibleShippingMethods || [];

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="bg-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {[
                { num: 1, label: 'Shipping' },
                { num: 2, label: 'Delivery' },
                { num: 3, label: 'Payment' },
                { num: 4, label: 'Confirmation' }
              ].map((step, idx) => (
                <div key={step.num} className="flex items-center">
                  <button
                    onClick={() => {
                      // Can only go back to previous steps, not forward
                      if (step.num < currentStep && step.num <= 3) {
                        router.push(`/checkout?step=${step.num}`);
                      }
                    }}
                    disabled={step.num >= currentStep || step.num === 4}
                    className={`flex items-center justify-center w-10 h-10 rounded-full ${
                      currentStep >= step.num ? 'bg-[var(--brand-secondary)] text-white' : 'bg-gray-300 text-gray-600'
                    } ${
                      step.num < currentStep && step.num <= 3 ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
                    } transition-opacity`}
                  >
                    {currentStep > step.num ? <CheckCircle className="w-6 h-6" /> : step.num}
                  </button>
                  <span className="ml-2 text-sm font-medium">{step.label}</span>
                  {idx < 3 && <div className="w-16 h-1 mx-4 bg-gray-300"></div>}
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
              <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Step 1: Shipping Address */}
          {currentStep === 1 && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold mb-6">Shipping Address</h2>
              <form onSubmit={handleShippingSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={shippingForm.fullName}
                    onChange={(e) => setShippingForm({ ...shippingForm, fullName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Street Address *</label>
                  <input
                    type="text"
                    required
                    value={shippingForm.streetLine1}
                    onChange={(e) => setShippingForm({ ...shippingForm, streetLine1: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apartment, suite, etc. (optional)</label>
                  <input
                    type="text"
                    value={shippingForm.streetLine2}
                    onChange={(e) => setShippingForm({ ...shippingForm, streetLine2: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                    <input
                      type="text"
                      required
                      value={shippingForm.city}
                      onChange={(e) => setShippingForm({ ...shippingForm, city: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State/Province *</label>
                    <input
                      type="text"
                      required
                      value={shippingForm.province}
                      onChange={(e) => setShippingForm({ ...shippingForm, province: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code *</label>
                    <input
                      type="text"
                      required
                      value={shippingForm.postalCode}
                      onChange={(e) => setShippingForm({ ...shippingForm, postalCode: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Country *</label>
                    {countriesLoading ? (
                      <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mr-2"></div>
                        <span className="text-gray-500 text-sm">Loading countries...</span>
                      </div>
                    ) : (
                      <select
                        required
                        value={shippingForm.countryCode}
                        onChange={(e) => setShippingForm({ ...shippingForm, countryCode: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                      >
                        <option value="">Select a country...</option>
                        {(countriesData?.availableCountries || []).map((country: any) => (
                          <option key={country.code} value={country.code}>
                            {country.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={shippingForm.phoneNumber}
                      onChange={(e) => setShippingForm({ ...shippingForm, phoneNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  disabled={processing}
                  loading={processing}
                >
                  Continue to Delivery
                </Button>
              </form>
            </div>
          )}

          {/* Step 2: Shipping Method */}
          {currentStep === 2 && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold mb-6">Select Shipping Method</h2>
              
              {shippingMethodsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--brand-primary)]"></div>
                  <span className="ml-3 text-gray-600">Loading shipping methods...</span>
                </div>
              ) : shippingMethodsError ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800">⚠️ Error loading shipping methods. Please try again.</p>
                  <p className="text-sm text-red-600 mt-2">{shippingMethodsError.message}</p>
                </div>
              ) : shippingMethods.length === 0 ? (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-yellow-800">⚠️ No shipping methods are currently available for your address.</p>
                  <p className="text-sm text-yellow-700 mt-2">Please contact support or try a different address.</p>
                  <Button
                    onClick={() => router.push('/checkout?step=1')}
                    variant="secondary"
                    size="md"
                    className="mt-4"
                  >
                    ← Back to Shipping Address
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {shippingMethods.map((method: any) => (
                      <label
                        key={method.id}
                        className={`block p-4 border-2 rounded-lg cursor-pointer ${
                          selectedShippingMethod === method.id ? 'border-[var(--brand-primary)] bg-gray-50' : 'border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="shipping"
                          value={method.id}
                          checked={selectedShippingMethod === method.id}
                          onChange={(e) => setSelectedShippingMethod(e.target.value)}
                          className="mr-3"
                        />
                        <span className="font-medium">{method.name}</span>
                        <span className="ml-4 text-gray-600">${(method.priceWithTax / 100).toFixed(2)}</span>
                        {method.description && <p className="text-sm text-gray-600 mt-1">{method.description}</p>}
                      </label>
                    ))}
                  </div>
                  <Button
                    onClick={handleShippingMethodSubmit}
                    variant="primary"
                    size="lg"
                    fullWidth
                    disabled={processing || !selectedShippingMethod}
                    loading={processing}
                    className="mt-6"
                  >
                    Continue to Payment
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Step 3: Payment */}
          {currentStep === 3 && (
            <div className="space-y-6">
              {/* Order Summary */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Order Summary
                </h2>
                <div className="space-y-4 mb-6">
                  {items.map((item) => (
                    <div key={item.variantId} className="pb-4 border-b last:border-b-0">
                      {item.isBundle ? (
                        <BundleCard
                          item={item}
                          showQuantityControls={false}
                          showRemoveButton={false}
                          showTotal={true}
                          compact={true}
                        />
                      ) : (
                        <div className="flex gap-3">
                          <div className="w-16 h-16 bg-gray-100 rounded flex-shrink-0 overflow-hidden">
                            {item.image ? (
                              <img 
                                src={item.image} 
                                alt={item.productName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-2xl">
                                🏋️
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            {item.slug ? (
                              <Link href={`/products/${item.slug}`}>
                                <h4 className="font-medium text-sm mb-1 hover:text-[var(--brand-primary)] transition-colors cursor-pointer">{item.productName}</h4>
                              </Link>
                            ) : (
                              <h4 className="font-medium text-sm mb-1">{item.productName}</h4>
                            )}
                            {item.variantName && (
                              <p className="text-xs text-gray-500 mb-1">{item.variantName}</p>
                            )}
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-500">Qty: {item.quantity}</span>
                              <span className="font-semibold text-sm">${((item.price * item.quantity) / 100).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Coupon Code Section */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-3">Have a Coupon Code?</h3>
                  <CouponCodeInput
                    appliedCoupons={activeOrderData?.activeOrder?.couponCodes || []}
                    onSuccess={() => refetchActiveOrder()}
                  />
                </div>

                {/* Reward Points Redemption */}
                <RewardPointsRedemption
                  orderTotal={(() => {
                    const selectedMethod = shippingMethods.find((m: any) => m.id === selectedShippingMethod);
                    const shippingCost = selectedMethod?.priceWithTax || 0;
                    return activeOrderData?.activeOrder?.totalWithTax || (totalPrice + shippingCost);
                  })()}
                  onRedemptionSuccess={(newTotal, points) => {
                    setPointsRedeemed(points);
                    setPointsDiscount(points); // 1 point = 1 cent discount
                    refetchActiveOrder();
                  }}
                  onRedemptionError={(error) => {
                    setError(error);
                  }}
                />
              </div>

              {/* Payment Method Selection */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-bold mb-6">Select Payment Method</h2>
                
                
                {paymentMethodsLoading && (
                  <div className="mb-4 p-3 bg-blue-50 border rounded-lg text-sm text-blue-700">
                    Loading payment methods...
                  </div>
                )}
                
                {paymentMethodsError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    Payment methods error: {paymentMethodsError.message}
                  </div>
                )}
                
                {/* Dynamic Payment Method Options */}
                <div className="space-y-4 mb-6">
                  {paymentMethodsData?.eligiblePaymentMethods?.length ? (
                    paymentMethodsData.eligiblePaymentMethods.map((method) => (
                      <PaymentMethodCard
                        key={method.id}
                        method={method as PaymentMethod}
                        isSelected={selectedPaymentMethod === method.code}
                        onSelect={setSelectedPaymentMethod}
                        disabled={processing || !method.isEligible}
                      />
                    ))
                  ) : (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
                      <p className="text-yellow-800">No payment methods are currently available.</p>
                      <p className="text-sm text-yellow-700 mt-1">Please contact support for assistance.</p>
                    </div>
                  )}
                </div>

                {/* Order Total Summary */}
                <div className="bg-gray-100 rounded-lg p-4 mb-6">
                  <div className="flex justify-between mb-2 text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="text-gray-900">${((activeOrderData?.activeOrder?.subTotalWithTax || totalPrice) / 100).toFixed(2)}</span>
                  </div>
                  
                  {/* Show all discounts from Vendure (exclude system bundle discount) */}
                  {activeOrderData?.activeOrder?.discounts
                    ?.filter((discount: any) => !discount.description.includes('System Bundle Discount') && !discount.description.includes('bundle discount'))
                    ?.map((discount: any, idx: number) => (
                      <div key={idx} className="flex justify-between mb-2 text-sm text-green-600">
                        <span>{discount.description}</span>
                        <span>-${(discount.amountWithTax / 100).toFixed(2)}</span>
                      </div>
                    ))}
                  
                  {(() => {
                    const selectedMethod = shippingMethods.find((m: any) => m.id === selectedShippingMethod);
                    const shippingCost = selectedMethod?.priceWithTax || 0;
                    const orderTotal = activeOrderData?.activeOrder?.totalWithTax || (totalPrice + shippingCost);
                    return (
                      <>
                        <div className="flex justify-between mb-2 text-sm">
                          <span className="text-gray-600">Shipping:</span>
                          <span className="text-gray-900">${(shippingCost / 100).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-lg border-t pt-2">
                          <span>Total:</span>
                          <span>${(orderTotal / 100).toFixed(2)}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Dynamic Payment Action */}
                {selectedPaymentMethod && paymentMethodsData?.eligiblePaymentMethods && (
                  (() => {
                    const selectedMethod = paymentMethodsData.eligiblePaymentMethods.find(
                      method => method.code === selectedPaymentMethod
                    );
                    
                    if (!selectedMethod) return null;
                    
                    const orderTotal = (() => {
                      const shippingMethod = shippingMethods.find((m: any) => m.id === selectedShippingMethod);
                      const shippingCost = shippingMethod?.priceWithTax || 0;
                      return activeOrderData?.activeOrder?.totalWithTax || (totalPrice + shippingCost);
                    })();
                    
                    return (
                      <PaymentActionButton
                        method={selectedMethod as PaymentMethod}
                        orderTotal={orderTotal}
                        onPaymentSuccess={handleClicToPayPaymentInitiated}
                        onPaymentError={handleClicToPayError}
                        onStandardPayment={handlePaymentSubmit}
                        disabled={processing || paymentProcessor.loading}
                      />
                    );
                  })()
                )}
              </div>
            </div>
          )}

          {/* Step 4: Confirmation */}
          {currentStep === 4 && (
            <div className="bg-white rounded-lg shadow-sm p-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Placed Successfully!</h2>
              <p className="text-gray-600 mb-4">Your order number is: <strong>{orderCode}</strong></p>
              <p className="text-gray-600 mb-6">We've sent a confirmation email to {customer?.emailAddress}</p>
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={() => router.push(`/account/orders`)}
                  variant="primary"
                  size="lg"
                >
                  View Orders
                </Button>
                <Button
                  onClick={() => router.push('/products')}
                  variant="secondary"
                  size="lg"
                >
                  Continue Shopping
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white">
        <Header />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--brand-primary)]"></div>
        </div>
        <Footer />
      </div>
    }>
      <CheckoutPageContent />
    </Suspense>
  );
}
