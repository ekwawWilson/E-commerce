'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, CheckCircle, XCircle, Clock, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api/client';

type PaymentStatus = 'pending' | 'processing' | 'success' | 'failed';

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const orderNumber = params.orderNumber as string;

  const [status, setStatus] = useState<PaymentStatus>('pending');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [orderTotal, setOrderTotal] = useState(0);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await api.trackOrder(orderNumber) as { success: boolean; data: { total: number; paymentStatus: string } };
        if (response.success && response.data) {
          setOrderTotal(response.data.total);
          if (response.data.paymentStatus === 'PAID') {
            router.push(`/orders/${orderNumber}/confirmation`);
          }
        }
      } catch (err) {
        console.error('Failed to fetch order:', err);
      }
    };

    fetchOrder();
  }, [orderNumber, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!phoneNumber || phoneNumber.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }

    setIsSubmitting(true);
    setStatus('processing');

    try {
      const response = await api.initiatePayment(orderNumber, phoneNumber) as { success: boolean; error?: string };

      if (response.success) {
        // Poll for payment status
        pollPaymentStatus();
      } else {
        setStatus('failed');
        setError(response.error || 'Payment initiation failed');
      }
    } catch (err) {
      setStatus('failed');
      setError('Failed to initiate payment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const pollPaymentStatus = async () => {
    let attempts = 0;
    const maxAttempts = 30;

    const checkStatus = async () => {
      try {
        const response = await api.checkPaymentStatus(orderNumber) as { success: boolean; data?: { status: string } };

        if (response.success && response.data) {
          if (response.data.status === 'PAID') {
            setStatus('success');
            setTimeout(() => {
              router.push(`/orders/${orderNumber}/confirmation`);
            }, 2000);
            return;
          } else if (response.data.status === 'FAILED') {
            setStatus('failed');
            setError('Payment was declined. Please try again.');
            return;
          }
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 5000);
        } else {
          setStatus('failed');
          setError('Payment timeout. Please check your phone for the prompt.');
        }
      } catch (err) {
        setStatus('failed');
        setError('Failed to verify payment status.');
      }
    };

    checkStatus();
  };

  return (
    <div className="container mx-auto max-w-md px-4 py-8">
      <Card>
        <CardHeader className="text-center">
          <CardTitle>Mobile Money Payment</CardTitle>
          <p className="text-sm text-muted-foreground">
            Order: {orderNumber}
          </p>
        </CardHeader>
        <CardContent>
          {status === 'pending' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="rounded-lg bg-muted p-4 text-center">
                <p className="text-2xl font-bold">
                  GHS {orderTotal.toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Amount to pay</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Mobile Money Number</Label>
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

              <Button type="submit" className="w-full" disabled={isSubmitting}>
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
