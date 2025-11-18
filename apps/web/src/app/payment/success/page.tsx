'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, ShoppingBag, Receipt, Clock } from 'lucide-react';
import { useClicToPayment } from '@/lib/hooks/useClicToPayment';
import { useCart } from '@/lib/hooks/useCart';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Button from '@/components/Button';

function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { checkStatus } = useClicToPayment();
  const { clearCart } = useCart();
  
  const [verifying, setVerifying] = useState(true);
  const [orderCode, setOrderCode] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        // Get parameters from URL (sent by ClicToPay)
        const orderId = searchParams.get('orderId') || searchParams.get('order_id');
        const txnId = searchParams.get('transactionId') || searchParams.get('txn_id');
        const status = searchParams.get('status');

        if (!orderId) {
          throw new Error('Missing order ID in payment return');
        }

        console.log('Payment success page - verifying:', { orderId, txnId, status });

        // Check payment status with backend
        const statusResult = await checkStatus(orderId);

        if (statusResult.status === 'PAID') {
          console.log('Payment verified successfully:', statusResult);
          
          setOrderCode(statusResult.orderCode || orderId);
          setTransactionId(statusResult.transactionId || txnId || '');
          setPaymentAmount(statusResult.amount || 0);
          
          // Clear the cart since payment is successful
          clearCart();
        } else if (statusResult.status === 'PENDING') {
          // Payment is still being processed
          console.log('Payment still pending, will check again...');
          
          // Wait 2 seconds and check again (ClicToPay might need time to process)
          setTimeout(async () => {
            const secondCheck = await checkStatus(orderId);
            if (secondCheck.status === 'PAID') {
              setOrderCode(secondCheck.orderCode || orderId);
              setTransactionId(secondCheck.transactionId || txnId || '');
              setPaymentAmount(secondCheck.amount || 0);
              clearCart();
            } else {
              setError('Payment is still being processed. Please check your order status later.');
            }
          }, 2000);
        } else {
          // Payment failed or unknown status
          console.error('Payment verification failed:', statusResult);
          throw new Error(statusResult.message || 'Payment could not be verified');
        }
      } catch (err: any) {
        console.error('Payment verification error:', err);
        setError(err.message || 'Failed to verify payment status');
      } finally {
        setVerifying(false);
      }
    };

    verifyPayment();
  }, [searchParams, checkStatus, clearCart]);

  if (verifying) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-[var(--brand-primary)] mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Verifying Payment</h2>
            <p className="text-gray-600">Please wait while we confirm your payment with ClicToPay...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className=\"min-h-screen bg-white\">
        <Header />
        <div className=\"min-h-screen bg-gray-50 flex items-center justify-center\">
          <div className=\"max-w-md mx-auto text-center px-4\">
            <div className=\"w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4\">
              <div className=\"w-8 h-8 bg-red-500 rounded-full flex items-center justify-center\">
                <span className=\"text-white text-sm font-bold\">!</span>
              </div>
            </div>
            <h1 className=\"text-2xl font-bold text-gray-900 mb-2\">Payment Verification Failed</h1>
            <p className=\"text-gray-600 mb-6\">{error}</p>
            <div className=\"space-y-3\">
              <Button
                onClick={() => router.push('/account/orders')}
                variant=\"primary\"
                size=\"lg\"
                fullWidth
              >
                Check Order Status
              </Button>
              <Button
                onClick={() => router.push('/checkout')}
                variant=\"secondary\"
                size=\"lg\"
                fullWidth
              >
                Return to Checkout
              </Button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className=\"min-h-screen bg-white\">
      <Header />
      <div className=\"min-h-screen bg-gray-50 py-12\">
        <div className=\"max-w-2xl mx-auto px-4 sm:px-6 lg:px-8\">
          {/* Success Header */}
          <div className=\"text-center mb-8\">
            <div className=\"w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4\">
              <CheckCircle className=\"w-12 h-12 text-green-600\" />
            </div>
            <h1 className=\"text-3xl font-bold text-gray-900 mb-2\">Payment Successful!</h1>
            <p className=\"text-lg text-gray-600\">Thank you for your purchase. Your payment has been processed successfully.</p>
          </div>

          {/* Payment Details Card */}
          <div className=\"bg-white rounded-lg shadow-sm p-6 mb-6\">
            <h2 className=\"text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2\">
              <Receipt className=\"w-5 h-5\" />
              Payment Details
            </h2>
            <div className=\"space-y-3\">
              <div className=\"flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0\">
                <span className=\"text-gray-600 font-medium\">Order Number:</span>
                <span className=\"font-mono text-gray-900 font-semibold\">{orderCode}</span>
              </div>
              {transactionId && (
                <div className=\"flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0\">
                  <span className=\"text-gray-600 font-medium\">Transaction ID:</span>
                  <span className=\"font-mono text-sm text-gray-700\">{transactionId}</span>
                </div>
              )}
              {paymentAmount > 0 && (
                <div className=\"flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0\">
                  <span className=\"text-gray-600 font-medium\">Amount Paid:</span>
                  <span className=\"text-lg font-bold text-green-600\">€{(paymentAmount / 100).toFixed(2)}</span>
                </div>
              )}
              <div className=\"flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0\">
                <span className=\"text-gray-600 font-medium\">Payment Method:</span>
                <span className=\"text-gray-900 font-semibold\">ClicToPay</span>
              </div>
              <div className=\"flex justify-between items-center py-2\">
                <span className=\"text-gray-600 font-medium\">Status:</span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  ✓ Paid
                </span>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              What&apos;s Next?
            </h3>
            <ul className="text-blue-800 text-sm space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span>You&apos;ll receive an order confirmation email shortly</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span>We&apos;ll send you shipping updates as your order is processed</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600">•</span>
                <span>You can track your order status in your account</span>
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={() => router.push(`/account/orders`)}
              variant="primary"
              size="lg"
              fullWidth
              className="flex items-center justify-center gap-2"
            >
              <Receipt className="w-5 h-5" />
              View Order Details
            </Button>
            <Button
              onClick={() => router.push('/products')}
              variant="secondary"
              size="lg"
              fullWidth
              className="flex items-center justify-center gap-2"
            >
              <ShoppingBag className="w-5 h-5" />
              Continue Shopping
            </Button>
          </div>

          {/* Support Link */}
          <div className="text-center mt-8">
            <p className="text-sm text-gray-500">
              Need help? <Link href="/contact" className="text-[var(--brand-primary)] hover:underline">Contact our support team</Link>
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default function PaymentSuccessPage() {
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
      <PaymentSuccessContent />
    </Suspense>
  );
}
