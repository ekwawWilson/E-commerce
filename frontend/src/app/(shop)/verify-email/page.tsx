'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { api } from '@/lib/api';
import { useCustomerStore } from '@/stores/customer';

function VerifyEmail() {
  const token = useSearchParams().get('token') || '';
  const refreshProfile = useCustomerStore((state) => state.refreshProfile);
  const [state, setState] = useState<'working' | 'done' | 'failed'>('working');
  const [error, setError] = useState('');
  const started = useRef(false);

  useEffect(() => {
    // Tokens are single-use, so confirm exactly once (React may run effects twice in dev)
    if (started.current) return;
    started.current = true;

    if (!token) {
      setState('failed');
      setError('This verification link is incomplete.');
      return;
    }

    api
      .confirmEmail(token)
      .then(() => {
        setState('done');
        refreshProfile();
      })
      .catch((err: any) => {
        setState('failed');
        setError(err.message || 'This link is invalid or has expired.');
      });
  }, [token, refreshProfile]);

  return (
    <div className="container flex min-h-[60vh] max-w-md items-center py-12">
      <Card className="w-full">
        <CardContent className="space-y-4 py-10 text-center">
          {state === 'working' && <Loader2 className="mx-auto h-12 w-12 animate-spin text-muted-foreground" />}
          {state === 'done' && (
            <>
              <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
              <p className="font-medium">Your email address is verified.</p>
              <Button asChild>
                <Link href="/account">Go to your account</Link>
              </Button>
            </>
          )}
          {state === 'failed' && (
            <>
              <XCircle className="mx-auto h-12 w-12 text-destructive" />
              <p className="text-muted-foreground">{error}</p>
              <Button asChild variant="outline">
                <Link href="/account/security">Send a new link</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmail />
    </Suspense>
  );
}
