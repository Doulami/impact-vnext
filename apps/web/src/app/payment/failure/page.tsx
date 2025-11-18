'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { XCircle, RefreshCw, ShoppingCart, AlertTriangle } from 'lucide-react';
import { useClicToPayment } from '@/lib/hooks/useClicToPayment';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Button from '@/components/Button';

function PaymentFailureContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { checkStatus } = useClicToPayment();
  
  const [loading, setLoading] = useState(true);
  const [orderCode, setOrderCode] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');

  useEffect(() => {
    const checkPaymentStatus = async () => {
      try {
        // Get parameters from URL (sent by ClicToPay)
        const orderId = searchParams.get('orderId') || searchParams.get('order_id');
        const txnId = searchParams.get('transactionId') || searchParams.get('txn_id');
        const error = searchParams.get('error') || searchParams.get('error_message');
        const status = searchParams.get('status');

        console.log('Payment failure page - checking:', { orderId, txnId, error, status });

        setTransactionId(txnId || '');
        setErrorMessage(error || 'Payment was cancelled or failed');

        if (orderId) {
          // Check current payment status with backend
          const statusResult = await checkStatus(orderId);
          setOrderCode(statusResult.orderCode || orderId);
          setPaymentStatus(statusResult.status || 'FAILED');
          
          // If somehow the payment actually succeeded, redirect to success page
          if (statusResult.status === 'PAID') {
            console.log('Payment actually succeeded, redirecting to success page');
            router.push(`/payment/success?orderId=${orderId}&transactionId=${txnId}`);
            return;
          }
        }
      } catch (err: any) {
        console.error('Error checking payment status:', err);
        setErrorMessage(err.message || 'Failed to verify payment status');
      } finally {
        setLoading(false);
      }
    };

    checkPaymentStatus();
  }, [searchParams, checkStatus, router]);

  const getFailureReason = () => {
    const status = searchParams.get('status')?.toLowerCase();
    const error = searchParams.get('error')?.toLowerCase();
    
    if (status === 'cancelled' || error?.includes('cancel')) {
      return {
        title: 'Payment Cancelled',
        description: 'You cancelled the payment process.',
        icon: <XCircle className="w-12 h-12 text-yellow-600" />,
        bgColor: 'bg-yellow-100',
        advice: 'You can try again or choose a different payment method.'
      };
    } else if (error?.includes('insufficient') || error?.includes('declined')) {
      return {
        title: 'Payment Declined',
        description: 'Your payment was declined by your bank or card issuer.',
        icon: <XCircle className="w-12 h-12 text-red-600" />,
        bgColor: 'bg-red-100',
        advice: 'Please check your card details or try a different payment method.'
      };
    } else if (error?.includes('expired') || error?.includes('timeout')) {
      return {
        title: 'Payment Session Expired',
        description: 'Your payment session timed out.',
        icon: <AlertTriangle className="w-12 h-12 text-orange-600" />,
        bgColor: 'bg-orange-100',
        advice: 'Please start the checkout process again.'
      };
    } else {
      return {
        title: 'Payment Failed',
        description: 'There was an issue processing your payment.',
        icon: <XCircle className="w-12 h-12 text-red-600" />,
        bgColor: 'bg-red-100',
        advice: 'Please try again or contact support if the problem persists.'
      };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[var(--brand-primary)] mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Checking Payment Status</h2>
            <p className="text-gray-600">Please wait while we verify your payment...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const failureInfo = getFailureReason();

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Failure Header */}
          <div className="text-center mb-8">
            <div className={`w-20 h-20 ${failureInfo.bgColor} rounded-full flex items-center justify-center mx-auto mb-4`}>
              {failureInfo.icon}
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{failureInfo.title}</h1>
            <p className="text-lg text-gray-600">{failureInfo.description}</p>
          </div>

          {/* Payment Details Card */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment Information</h2>
            <div className="space-y-3">
              {orderCode && (
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600 font-medium">Order Number:</span>
                  <span className="font-mono text-gray-900 font-semibold">{orderCode}</span>
                </div>
              )}
              {transactionId && (
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600 font-medium">Transaction ID:</span>
                  <span className="font-mono text-sm text-gray-700">{transactionId}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600 font-medium">Payment Method:</span>
                <span className="text-gray-900 font-semibold">ClicToPay</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600 font-medium">Status:</span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                  ✗ {paymentStatus || 'Failed'}
                </span>
              </div>
              {errorMessage && (
                <div className="pt-3">
                  <span className="text-gray-600 font-medium text-sm">Error Details:</span>
                  <p className="text-sm text-red-600 mt-1 p-3 bg-red-50 rounded-lg border border-red-200">
                    {errorMessage}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* What to do next */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">What can you do?</h3>
            <p className="text-blue-800 text-sm mb-3">{failureInfo.advice}</p>
            <ul className="text-blue-800 text-sm space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span>Double-check your card details and try again</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span>Contact your bank if your card was declined</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span>Try using a different payment method</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span>Your items are still saved in your cart</span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Button
              onClick={() => router.push('/checkout?step=3')}
              variant="primary"
              size="lg"
              fullWidth
              className="flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              Try Again
            </Button>
            <Button
              onClick={() => router.push('/cart')}
              variant="secondary"
              size="lg"
              fullWidth
              className="flex items-center justify-center gap-2"
            >
              <ShoppingCart className="w-5 h-5" />
              View Cart
            </Button>
          </div>

          {/* Alternative Payment Methods */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Alternative Payment Options</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-sm">📦</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Cash on Delivery</h4>
                    <p className="text-sm text-gray-600">Pay when you receive your order</p>
                  </div>
                </div>
                <Button
                  onClick={() => router.push('/checkout?step=3&method=cod')}
                  variant="outline"
                  size="sm"
                >
                  Select
                </Button>
              </div>
            </div>
          </div>

          {/* Support Link */}
          <div className="text-center">
            <p className="text-sm text-gray-500">
              Still having trouble? <Link href="/contact" className="text-[var(--brand-primary)] hover:underline">Contact our support team</Link>
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default function PaymentFailurePage() {
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
      <PaymentFailureContent />
    </Suspense>
  );
}