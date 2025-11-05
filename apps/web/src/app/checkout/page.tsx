'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { useCart } from '@/lib/hooks/useCart';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  ADD_ITEM_TO_ORDER,
  SET_ORDER_SHIPPING_ADDRESS,
  GET_ELIGIBLE_SHIPPING_METHODS,
  SET_ORDER_SHIPPING_METHOD,
  TRANSITION_TO_ARRANGING_PAYMENT,
  ADD_PAYMENT_TO_ORDER,
  GET_ACTIVE_ORDER
} from '@/lib/graphql/checkout';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Button from '@/components/Button';
import { Package, CreditCard, CheckCircle, AlertCircle } from 'lucide-react';

export default function CheckoutPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading, customer } = useAuth();
  const { items, totalPrice, clearCart } = useCart();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [orderCreated, setOrderCreated] = useState(false);
  const [orderCode, setOrderCode] = useState('');
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [orderCompleted, setOrderCompleted] = useState(false);

  const [shippingForm, setShippingForm] = useState({
    fullName: '',
    streetLine1: '',
    streetLine2: '',
    city: '',
    province: '',
    postalCode: '',
    countryCode: 'US',
    phoneNumber: ''
  });

  // GraphQL mutations
  const [addItemToOrder] = useMutation(ADD_ITEM_TO_ORDER);
  const [setShippingAddress] = useMutation(SET_ORDER_SHIPPING_ADDRESS);
  const [setShippingMethod] = useMutation(SET_ORDER_SHIPPING_METHOD);
  const [transitionToPayment] = useMutation(TRANSITION_TO_ARRANGING_PAYMENT);
  const [addPayment] = useMutation(ADD_PAYMENT_TO_ORDER);

  const { data: shippingMethodsData } = useQuery(GET_ELIGIBLE_SHIPPING_METHODS, {
    skip: currentStep !== 2
  });

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
      // Step 1: Add items to Vendure order
      for (const item of items) {
        await addItemToOrder({
          variables: {
            productVariantId: item.variantId,
            quantity: item.quantity
          }
        });
      }
      setOrderCreated(true);

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

      setCurrentStep(2);
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

      setCurrentStep(3);
    } catch (err: any) {
      console.error('Shipping method error:', err);
      setError(err.message || 'Failed to set shipping method');
    } finally {
      setProcessing(false);
    }
  };

  const handlePaymentSubmit = async () => {
    setError('');
    setProcessing(true);

    try {
      // Transition to arranging payment
      await transitionToPayment();

      // Add Cash on Delivery payment
      const { data } = await addPayment({
        variables: {
          input: {
            method: 'cash-on-delivery',
            metadata: {
              paymentType: 'COD'
            }
          }
        }
      });

      const order = (data as any)?.addPaymentToOrder;
      if (order && '__typename' in order && order.__typename === 'Order' && order.code) {
        setOrderCompleted(true); // Mark order as completed to prevent cart redirect
        clearCart(); // Clear local cart after successful order
        // Redirect to thank you page with order code
        router.push(`/thank-you?order=${order.code}`);
      } else {
        throw new Error('Payment failed or order not created');
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || 'Failed to process payment');
    } finally {
      setProcessing(false);
    }
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
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                    currentStep >= step.num ? 'bg-[var(--brand-secondary)] text-white' : 'bg-gray-300 text-gray-600'
                  }`}>
                    {currentStep > step.num ? <CheckCircle className="w-6 h-6" /> : step.num}
                  </div>
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
            </div>
          )}

          {/* Step 3: Payment */}
          {currentStep === 3 && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold mb-6">Payment Method</h2>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  <strong>Cash on Delivery:</strong> Pay when you receive your order. Our delivery agent will collect payment upon delivery.
                </p>
              </div>
              <div className="border-2 border-[var(--brand-primary)] rounded-lg p-6 mb-6 bg-gray-50">
                <div className="flex items-center mb-4">
                  <Package className="w-6 h-6 text-gray-900 mr-3" />
                  <span className="font-medium text-lg">Cash on Delivery (COD)</span>
                </div>
                <p className="text-sm text-gray-600">Pay in cash when your order is delivered to your address.</p>
                <p className="text-xs text-gray-500 mt-2">💡 Please keep the exact amount ready for a smooth transaction.</p>
              </div>
              <div className="bg-gray-100 rounded-lg p-4 mb-6">
                <div className="flex justify-between mb-2">
                  <span>Subtotal:</span>
                  <span>${(totalPrice / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span>${(totalPrice / 100).toFixed(2)}</span>
                </div>
              </div>
              <Button
                onClick={handlePaymentSubmit}
                variant="primary"
                size="lg"
                fullWidth
                disabled={processing}
                loading={processing}
              >
                Place Order
              </Button>
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