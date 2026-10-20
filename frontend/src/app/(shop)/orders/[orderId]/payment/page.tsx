'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, CheckCircle, XCircle, Clock, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api/client';
import { loadCheckoutContact } from '@/lib/checkout-contact';
import { formatPrice } from '@/lib/utils';

type PaymentStatus = 'pending' | 'processing' | 'success' | 'failed';

const POLL_INTERVAL_MS = 5000;
const MAX_POLLS = 30;

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;

  const [status, setStatus] = useState<PaymentStatus>('pending');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [orderTotal, setOrderTotal] = useState<number | null>(null);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const contact = loadCheckoutContact(orderId);
    if (contact?.customerPhone) {
      setPhoneNumber(contact.customerPhone);
    }

    const fetchOrder = async () => {
      try {
        const response = await api.getOrder(orderId);
        const order = response.data;
        setOrderNumber(order.orderNumber);
        setOrderTotal(Number(order.total));
        if (order.paymentStatus === 'PAID') {
          router.replace(`/orders/${orderId}/confirmation`);
        } else if (order.cancelledAt) {
          setStatus('failed');
          setError('This order has been cancelled.');
        }
      } catch {
        setStatus('failed');
        setError("We couldn't find this order.");
      }
    };

    fetchOrder();
    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, [orderId, router]);

  const pollPaymentStatus = (transactionId: string) => {
    let attempts = 0;

    const checkStatus = async () => {
      try {
        const response = await api.verifyPayment(transactionId);
        const paymentStatus = response.data?.status;

        if (paymentStatus === 'PAID') {
          setStatus('success');
          pollTimer.current = setTimeout(() => router.push(`/orders/${orderId}/confirmation`), 2000);
          return;
        }
        if (paymentStatus === 'FAILED') {
          setStatus('failed');
          setError('Payment was declined. Please try again.');
          return;
        }
      } catch {
        // Network blips shouldn't end the wait; keep polling until the limit
      }

      attempts++;
      if (attempts < MAX_POLLS) {
        pollTimer.current = setTimeout(checkStatus, POLL_INTERVAL_MS);
      } else {
        setStatus('failed');
        setError("We didn't receive your approval in time. Please check your phone and try again.");
      }
    };

    checkStatus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!phoneNumber || phoneNumber.replace(/\D/g, '').length < 9) {
      setError('Please enter a valid phone number');
      return;
    }

    setIsSubmitting(true);
    setStatus('processing');

    try {
      const response = await api.initiatePayment(orderId, phoneNumber);
      const transactionId = response.data?.transactionId;

      if (response.success && transactionId) {
        pollPaymentStatus(transactionId);
      } else {
        setStatus('failed');
        setError(response.message || 'Payment initiation failed');
      }
    } catch (err: any) {
      setStatus('failed');
      setError(err.message || 'Failed to initiate payment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto max-w-md px-4 py-8">
      <Card>
        <CardHeader className="text-center">
          <CardTitle>Mobile Money Payment</CardTitle>
          {orderNumber && (
            <p className="text-sm text-muted-foreground">Order: {orderNumber}</p>
          )}
        </CardHeader>
        <CardContent>
          {status === 'pending' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="rounded-lg bg-muted p-4 text-center">
                <p className="text-2xl font-bold">
                  {orderTotal === null ? '…' : formatPrice(orderTotal)}
                </p>
                <p className="text-sm text-muted-foreground">Amount to pay</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">MTN Mobile Money Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="024 XXX XXXX"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting || orderTotal === null}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Initiating...
                  </>
                ) : (
                  'Pay Now'
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                You will receive a prompt on your phone to approve the payment
              </p>
            </form>
          )}

          {status === 'processing' && (
            <div className="space-y-4 text-center">
              <Clock className="mx-auto h-16 w-16 animate-pulse text-yellow-500" />
              <div>
                <h3 className="text-lg font-semibold">
                  Waiting for Payment Approval
                </h3>
                <p className="text-sm text-muted-foreground">
                  Please check your phone and approve the payment prompt
                </p>
              </div>
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm">
                  A payment request has been sent to{' '}
                  <strong>{phoneNumber}</strong>
                </p>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4 text-center">
              <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
              <div>
                <h3 className="text-lg font-semibold">Payment Successful!</h3>
                <p className="text-sm text-muted-foreground">
                  Redirecting to confirmation page...
                </p>
              </div>
            </div>
          )}

          {status === 'failed' && (
            <div className="space-y-4 text-center">
              <XCircle className="mx-auto h-16 w-16 text-destructive" />
              <div>
                <h3 className="text-lg font-semibold">Payment Failed</h3>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
              <Button
                onClick={() => {
                  setStatus('pending');
                  setError('');
                }}
                className="w-full"
              >
                Try Again
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
