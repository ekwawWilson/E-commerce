'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ChevronLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { customerFetch } from '@/stores/customer';
import { useRequireCustomer } from '@/hooks/use-require-customer';

function VerifiedBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <Badge className="bg-green-100 text-green-800">
      <CheckCircle2 className="mr-1 h-3 w-3" />
      Verified
    </Badge>
  ) : (
    <Badge variant="secondary">Not verified</Badge>
  );
}

export default function SecurityPage() {
  const { customer, changePassword, refreshProfile } = useRequireCustomer('/account/security');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const [emailMessage, setEmailMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [phoneMessage, setPhoneMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPhoneBusy, setIsPhoneBusy] = useState(false);

  if (!customer) {
    return <div className="container py-12 text-center">Loading...</div>;
  }

  const hasRealPhone = !!customer.phone && !customer.phone.startsWith('google_');

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);
    if (newPassword.length < 8) {
      setPasswordMessage({ ok: false, text: 'New password must be at least 8 characters' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ ok: false, text: 'Passwords do not match' });
      return;
    }
    setIsSavingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMessage({ ok: true, text: 'Password changed. You have been signed out on other devices.' });
    } catch (err: any) {
      setPasswordMessage({ ok: false, text: err.message || 'Could not change your password' });
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleSendEmail = async () => {
    setIsSendingEmail(true);
    setEmailMessage(null);
    try {
      await customerFetch('/verify-email/request', { method: 'POST' });
      setEmailMessage({ ok: true, text: `We sent a verification link to ${customer.email}.` });
    } catch (err: any) {
      setEmailMessage({ ok: false, text: err.message || 'Could not send the email' });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSendCode = async () => {
    setIsPhoneBusy(true);
    setPhoneMessage(null);
    try {
      await customerFetch('/verify-phone/request', { method: 'POST' });
      setCodeSent(true);
      setPhoneMessage({ ok: true, text: `We sent a 6-digit code to ${customer.phone}.` });
    } catch (err: any) {
      setPhoneMessage({ ok: false, text: err.message || 'Could not send the code' });
    } finally {
      setIsPhoneBusy(false);
    }
  };

  const handleConfirmCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPhoneBusy(true);
    setPhoneMessage(null);
    try {
      await customerFetch('/verify-phone/confirm', { method: 'POST', body: JSON.stringify({ code: code.trim() }) });
      setCodeSent(false);
      setCode('');
      await refreshProfile();
      setPhoneMessage({ ok: true, text: 'Your phone number is verified.' });
    } catch (err: any) {
      setPhoneMessage({ ok: false, text: err.message || 'That code did not work' });
    } finally {
      setIsPhoneBusy(false);
    }
  };

  const message = (m: { ok: boolean; text: string } | null) =>
    m && <p className={`text-sm ${m.ok ? 'text-green-700' : 'text-destructive'}`}>{m.text}</p>;

  return (
    <div className="container max-w-2xl py-8">
      <Button variant="ghost" size="sm" asChild className="mb-6">
        <Link href="/account">
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to Account
        </Link>
      </Button>

      <h1 className="mb-6 text-2xl font-light tracking-wider">SECURITY</h1>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Email address
              <VerifiedBadge verified={customer.emailVerified} />
            </CardTitle>
            <CardDescription>{customer.email}</CardDescription>
          </CardHeader>
          {!customer.emailVerified && (
            <CardContent className="space-y-3">
              <Button variant="outline" onClick={handleSendEmail} disabled={isSendingEmail}>
                {isSendingEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send verification email
              </Button>
              {message(emailMessage)}
            </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Phone number
              {hasRealPhone && <VerifiedBadge verified={customer.phoneVerified} />}
            </CardTitle>
            <CardDescription>
              {hasRealPhone ? customer.phone : 'Add your phone number to your profile to verify it.'}
            </CardDescription>
          </CardHeader>
          {hasRealPhone && !customer.phoneVerified && (
            <CardContent className="space-y-3">
              {codeSent ? (
                <form onSubmit={handleConfirmCode} className="flex gap-2">
                  <Input
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="6-digit code"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    className="max-w-[10rem]"
                  />
                  <Button type="submit" disabled={isPhoneBusy || code.length !== 6}>
                    {isPhoneBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Verify
                  </Button>
                  <Button type="button" variant="ghost" onClick={handleSendCode} disabled={isPhoneBusy}>
                    Resend
                  </Button>
                </form>
              ) : (
                <Button variant="outline" onClick={handleSendCode} disabled={isPhoneBusy}>
                  {isPhoneBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send verification code
                </Button>
              )}
              {message(phoneMessage)}
            </CardContent>
          )}
          {!hasRealPhone && (
            <CardContent>
              <Button variant="outline" asChild>
                <Link href="/account/profile">Add phone number</Link>
              </Button>
            </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Change password</CardTitle>
            <CardDescription>
              Signed in with Google and never set a password?{' '}
              <Link href="/forgot-password" className="underline">
                Set one by email
              </Link>
              .
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm new password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              {message(passwordMessage)}
              <Button type="submit" disabled={isSavingPassword || !currentPassword || !newPassword}>
                {isSavingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Change password
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
