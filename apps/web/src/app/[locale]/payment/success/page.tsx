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
          
          const orderCodeValue = statusResult.orderCode || orderId;
          setOrderCode(orderCodeValue);
          setTransactionId(statusResult.transactionId || txnId || '');
          setPaymentAmount(statusResult.amount || 0);
          
          // Clear the cart since payment is successful
          clearCart();
          
          // Redirect to thank you page after short delay
          setTimeout(() => {
            router.push(`/thank-you?order=${orderCodeValue}`);
          }, 2000);
        } else if (statusResult.status === 'PENDING') {
          // Payment is still being processed
          console.log('Payment still pending, will check again...');
          
          // Wait 2 seconds and check again (ClicToPay might need time to process)
          setTimeout(async () => {
            const secondCheck = await checkStatus(orderId);
            if (secondCheck.status === 'PAID') {
              const orderCodeValue = secondCheck.orderCode || orderId;
              setOrderCode(orderCodeValue);
              setTransactionId(secondCheck.transactionId || txnId || '');
              setPaymentAmount(secondCheck.amount || 0);
              clearCart();
              
              // Redirect to thank you page
              setTimeout(() => {
                router.push(`/thank-you?order=${orderCodeValue}`);
              }, 2000);
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
      <div className="min-h-screen bg-white">
        <Header />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="max-w-md mx-auto text-center px-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-bold">!</span>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Verification Failed</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="space-y-3">
              <Button
                onClick={() => router.push('/account/orders')}
                variant="primary"
                size="lg"
                fullWidth
              >
                Check Order Status
              </Button>
              <Button
                onClick={() => router.push('/checkout')}
                variant="secondary"
                size="lg"
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

  // Show redirecting message after payment verified
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Payment Successful!</h1>
          <p className="text-lg text-gray-600 mb-8">Your payment has been confirmed.</p>
          
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[var(--brand-primary)]"></div>
            <p className="text-gray-700 font-medium">Redirecting you to your order summary...</p>
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
